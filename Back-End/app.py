from __future__ import annotations

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import httpx
import uvicorn
import jwt
import os
import re
import joblib
import datetime
import time
from collections import defaultdict
from threading import Lock

from auth import verify_password
from waf import inspect_and_proxy, invalidate_rules_cache
from adminLogger import log_admin_action
from db import get_db_connection
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SWAF API", version="1.0.0")

# ─── CORS ────────────────────────────────────────────────────────────────────
_origins = ["http://localhost:3000", "http://localhost:5000", "http://localhost:8080"]
_extra = os.getenv("FRONTEND_URL", "")
if _extra and _extra not in _origins:
    _origins.append(_extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

JWT_SECRET    = os.getenv("JWT_SECRET", "changeme")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


# ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

def create_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(credentials: HTTPAuthorizationCredentials) -> dict:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    try:
        return jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired — please log in again")
    except Exception:
        raise HTTPException(401, "Invalid or missing token")


def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """FastAPI dependency: validates JWT and asserts admin role."""
    decoded = decode_token(credentials)
    if decoded.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return decoded


# ─── LOGIN BRUTE-FORCE PROTECTION ────────────────────────────────────────────
_login_attempts: dict[str, list[float]] = defaultdict(list)
_login_lock = Lock()
LOGIN_MAX_ATTEMPTS = 10
LOGIN_WINDOW_SECONDS = 60


def check_login_rate_limit(ip: str) -> None:
    now = time.monotonic()
    cutoff = now - LOGIN_WINDOW_SECONDS
    with _login_lock:
        attempts = _login_attempts[ip]
        # Remove old attempts outside the window
        _login_attempts[ip] = [t for t in attempts if t > cutoff]
        if len(_login_attempts[ip]) >= LOGIN_MAX_ATTEMPTS:
            raise HTTPException(429, "Too many login attempts. Try again later.")
        _login_attempts[ip].append(now)


# ─── DB HELPER ───────────────────────────────────────────────────────────────

def db_query(sql: str, params: tuple = (), *, fetch: str = "all", commit: bool = False):
    """Run a query and return results. Handles connection lifecycle."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params)
        if commit:
            conn.commit()
            return cursor.rowcount
        if fetch == "one":
            return cursor.fetchone()
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


# ─── AUTHENTICATION ──────────────────────────────────────────────────────────

@app.post("/login", tags=["Auth"])
async def login(request: Request):
    """Authenticate admin user and return a JWT."""
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")

    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        raise HTTPException(400, "Username and password required")

    # Brute-force guard
    client_ip = request.client.host
    check_login_rate_limit(client_ip)

    user = db_query(
        "SELECT id, username, password, role FROM users WHERE username = %s",
        (username,), fetch="one"
    )

    if not user or not verify_password(password, user["password"]):
        log_admin_action(
            username=username, action="LOGIN", status="FAILED",
            ip=client_ip, user_agent=request.headers.get("user-agent", "")
        )
        raise HTTPException(401, "Invalid credentials")

    log_admin_action(
        username=username, action="LOGIN", status="SUCCESS",
        ip=client_ip, user_agent=request.headers.get("user-agent", "")
    )

    token = create_token(user["id"], user["role"])
    return {"token": token, "role": user["role"]}


# ─── DASHBOARD ───────────────────────────────────────────────────────────────

@app.get("/api/dashboard-stats", tags=["Dashboard"])
async def dashboard_stats(_: dict = Depends(require_admin)):
    """
    Single endpoint that returns all overview stats in one DB round-trip.
    Replaces multiple separate calls from the frontend.
    """
    rows = db_query("SELECT action, threat_type, source_ip FROM logs")

    total   = len(rows)
    blocked = sum(1 for r in rows if r["action"] == "BLOCKED")
    allowed = total - blocked

    threat_count: dict[str, int] = {}
    for r in rows:
        tt = r.get("threat_type") or "None"
        for t in tt.split(","):
            k = t.strip()
            threat_count[k] = threat_count.get(k, 0) + 1

    top_threats = sorted(
        [{"name": k, "value": v} for k, v in threat_count.items()],
        key=lambda x: -x["value"]
    )[:5]

    return {
        "totalRequests": total,
        "blocked": blocked,
        "allowed": allowed,
        "blockRate": round((blocked / total * 100), 1) if total else 0,
        "topThreats": top_threats,
    }


# ─── SECURITY LOGS ───────────────────────────────────────────────────────────

@app.get("/logs", tags=["Logs"])
async def get_logs(
    limit:  int = 200,
    offset: int = 0,
    action: str = "",
    search: str = "",
    _: dict = Depends(require_admin),
):
    """Fetch security logs with optional filtering."""
    base  = "SELECT * FROM logs"
    where = []
    params: list = []

    if action in ("BLOCKED", "ALLOWED"):
        where.append("action = %s")
        params.append(action)

    if search:
        where.append("(source_ip LIKE %s OR request_path LIKE %s OR threat_type LIKE %s)")
        q = f"%{search}%"
        params.extend([q, q, q])

    if where:
        base += " WHERE " + " AND ".join(where)

    base += " ORDER BY timestamp DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    return db_query(base, tuple(params))


# ─── ADMIN LOGS ──────────────────────────────────────────────────────────────

@app.get("/api/admin-logs", tags=["Logs"])
async def get_admin_logs(_: dict = Depends(require_admin)):
    return db_query("SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 200")


# ─── THREAT INTELLIGENCE ─────────────────────────────────────────────────────

@app.get("/api/threat-intelligence", tags=["Analytics"])
async def threat_intelligence(_: dict = Depends(require_admin)):
    top_threats = db_query("""
        SELECT IFNULL(threat_type,'None') as name, COUNT(*) as value
        FROM logs GROUP BY threat_type ORDER BY value DESC
    """)

    top_ips = db_query("""
        SELECT source_ip, COUNT(*) as count
        FROM logs WHERE action = 'BLOCKED'
        GROUP BY source_ip ORDER BY count DESC LIMIT 10
    """)

    total   = (db_query("SELECT COUNT(*) as n FROM logs",           fetch="one") or {}).get("n", 0)
    blocked = (db_query("SELECT COUNT(*) as n FROM logs WHERE action='BLOCKED'", fetch="one") or {}).get("n", 0)
    allowed = (db_query("SELECT COUNT(*) as n FROM logs WHERE action='ALLOWED'", fetch="one") or {}).get("n", 0)

    return {
        "topThreats": top_threats,
        "topIPs":     top_ips,
        "stats":      {"total": total, "blocked": blocked, "allowed": allowed},
    }


# ─── LIVE TRAFFIC ────────────────────────────────────────────────────────────

@app.get("/api/live-traffic", tags=["Analytics"])
async def get_live_traffic(_: dict = Depends(require_admin)):
    rows = db_query("""
        SELECT
            DATE_FORMAT(timestamp, '%H:%i') AS time,
            COUNT(*) AS requests,
            SUM(CASE WHEN action = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked
        FROM logs
        WHERE timestamp >= NOW() - INTERVAL 5 MINUTE
        GROUP BY time ORDER BY time ASC
    """)
    for row in rows:
        if row["blocked"] is None:
            row["blocked"] = 0
    return {"timeseries": rows}


# ─── WAF RULES ───────────────────────────────────────────────────────────────

@app.get("/api/rules", tags=["Rules"])
async def get_rules(_: dict = Depends(require_admin)):
    return db_query("SELECT * FROM rules ORDER BY id ASC")


@app.post("/api/rules", tags=["Rules"])
async def add_rule(request: Request, _: dict = Depends(require_admin)):
    data = await request.json()

    rule_name   = (data.get("rule_name") or "").strip()
    pattern     = (data.get("pattern") or "").strip()
    threat_type = (data.get("threat_type") or "").strip()
    action      = data.get("action", "BLOCK")

    if not rule_name or not pattern:
        raise HTTPException(400, "rule_name and pattern are required")

    if action not in ("BLOCK", "LOG", "ALLOW"):
        raise HTTPException(400, "action must be BLOCK, LOG, or ALLOW")

    try:
        re.compile(pattern)
    except re.error as e:
        raise HTTPException(400, f"Invalid regex pattern: {e}")

    db_query(
        "INSERT INTO rules (rule_name, pattern, threat_type, action, enabled) VALUES (%s,%s,%s,%s,1)",
        (rule_name, pattern, threat_type, action),
        commit=True,
    )
    invalidate_rules_cache()
    return {"message": "Rule added successfully"}


@app.delete("/api/rules/{rule_id}", tags=["Rules"])
async def delete_rule(rule_id: int, _: dict = Depends(require_admin)):
    rows = db_query("DELETE FROM rules WHERE id=%s", (rule_id,), commit=True)
    if rows == 0:
        raise HTTPException(404, "Rule not found")
    invalidate_rules_cache()
    return {"message": "Rule deleted"}


@app.put("/api/rules/{rule_id}", tags=["Rules"])
async def update_rule(rule_id: int, request: Request, _: dict = Depends(require_admin)):
    data = await request.json()

    # Toggle-only (enabled field only)
    if set(data.keys()) == {"enabled"}:
        db_query("UPDATE rules SET enabled=%s WHERE id=%s", (data["enabled"], rule_id), commit=True)
        invalidate_rules_cache()
        return {"message": "Rule updated"}

    rule_name   = (data.get("rule_name") or "").strip()
    pattern     = (data.get("pattern") or "").strip()
    threat_type = (data.get("threat_type") or "").strip()
    action      = data.get("action", "BLOCK")

    if not rule_name or not pattern:
        raise HTTPException(400, "rule_name and pattern are required")

    if action not in ("BLOCK", "LOG", "ALLOW"):
        raise HTTPException(400, "action must be BLOCK, LOG, or ALLOW")

    try:
        re.compile(pattern)
    except re.error as e:
        raise HTTPException(400, f"Invalid regex: {e}")

    db_query(
        "UPDATE rules SET rule_name=%s, pattern=%s, threat_type=%s, action=%s WHERE id=%s",
        (rule_name, pattern, threat_type, action, rule_id),
        commit=True,
    )
    invalidate_rules_cache()
    return {"message": "Rule updated"}


# ─── SETTINGS ────────────────────────────────────────────────────────────────

@app.get("/api/settings", tags=["Settings"])
async def get_waf_settings(_: dict = Depends(require_admin)):
    from waf import RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS
    return {
        "target_app_url":          os.getenv("TARGET_SERVER", "http://localhost:8080"),
        "waf_mode":                os.getenv("WAF_MODE", "block"),
        "listening_port":          5000,
        "enable_logging":          True,
        "rate_limit_max_requests": RATE_LIMIT_MAX_REQUESTS,
        "rate_limit_window_seconds": RATE_LIMIT_WINDOW_SECONDS,
    }


@app.post("/api/settings", tags=["Settings"])
async def update_waf_settings(request: Request, _: dict = Depends(require_admin)):
    """
    Persist settings to the .env file so they survive restarts.
    Only TARGET_SERVER and WAF_MODE are writable at runtime.
    """
    data       = await request.json()
    env_path   = os.path.join(os.path.dirname(__file__), ".env")
    updates    = {}

    if "target_app_url" in data:
        updates["TARGET_SERVER"] = data["target_app_url"]
        os.environ["TARGET_SERVER"] = data["target_app_url"]
        # Update WAF module
        import waf as waf_module
        waf_module.TARGET_URL = data["target_app_url"].rstrip("/")

    if "waf_mode" in data:
        updates["WAF_MODE"] = data["waf_mode"]
        os.environ["WAF_MODE"] = data["waf_mode"]

    # Rewrite .env file
    if updates and os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
        with open(env_path, "w") as f:
            for line in lines:
                key = line.split("=")[0].strip()
                if key in updates:
                    f.write(f"{key}={updates[key]}\n")
                else:
                    f.write(line)
            # Add any keys that weren't already in the file
            existing_keys = {l.split("=")[0].strip() for l in lines}
            for k, v in updates.items():
                if k not in existing_keys:
                    f.write(f"{k}={v}\n")

    return {"message": "Settings saved successfully"}


@app.post("/api/test-connection", tags=["Settings"])
async def test_backend_connection(request: Request, _: dict = Depends(require_admin)):
    data       = await request.json()
    target_url = data.get("target_url", "").strip()
    if not target_url:
        raise HTTPException(400, "target_url is required")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(target_url)
            return {"message": f"Connection successful — HTTP {resp.status_code}"}
    except httpx.ConnectError:
        raise HTTPException(400, f"Cannot connect to {target_url}")
    except Exception as e:
        raise HTTPException(400, f"Connection failed: {e}")


# ─── ML MODELS ───────────────────────────────────────────────────────────────

@app.get("/api/ml/model-info", tags=["ML"])
async def get_model_info(_: dict = Depends(require_admin)):
    from waf import get_ml_engine
    engine = get_ml_engine()
    if engine:
        return engine.get_info()
    return {"error": "ML engine not initialized"}


@app.get("/api/ml/model-metrics", tags=["ML"])
async def get_model_metrics(_: dict = Depends(require_admin)):
    base = os.path.dirname(__file__)
    paths = {
        "xgboost":     os.path.join(base, "ml_model", "xgboost",     "metrics.pkl"),
        "autoencoder": os.path.join(base, "ml_model", "autoencoders","metrics.pkl"),
    }
    return {
        name: joblib.load(path)
        for name, path in paths.items()
        if os.path.exists(path)
    }


# ─── WAF REVERSE PROXY (must be LAST) ────────────────────────────────────────

@app.api_route("/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH","OPTIONS","HEAD"])
async def waf_proxy(request: Request, path: str):
    content, status, headers = await inspect_and_proxy(request)
    return Response(content=content, status_code=status, headers=headers)


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)
