from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import httpx
from auth import verify_password
from waf import inspect_and_proxy
from adminLogger import log_admin_action
from db import get_db_connection
from dotenv import load_dotenv

import uvicorn
import jwt
import os
import datetime

load_dotenv()

app = FastAPI()

# CORS — base origins plus any extra URL set via FRONTEND_URL env var
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
# AUTH

@app.post("/login")
async def login(request: Request):
    # Remove the inspect_and_proxy call - login should be handled directly
    
    try:
        data = await request.json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            raise HTTPException(400, "Username and password required")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, username, password, role FROM users WHERE username = %s",
            (username,)
        )
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user or not verify_password(password, user['password']):
            log_admin_action(
                username=username,
                action="LOGIN",
                status="FAILED",
                ip=request.client.host,
                user_agent=request.headers.get("user-agent", "")
            )
            raise HTTPException(401, "Invalid credentials")

        log_admin_action(
            username=username,
            action="LOGIN",
            status="SUCCESS",
            ip=request.client.host,
            user_agent=request.headers.get("user-agent", "")
        )

        token = jwt.encode(
            {"user_id": user['id'], "role": user['role']},
            os.getenv("JWT_SECRET"),
            algorithm="HS256"
        )

        return {"token": token, "role": user['role']}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ADMIN DASHBOARD API

@app.get("/logs", dependencies=[Depends(security)])
async def get_logs(authorization: str = Depends(security)):
    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )
        if decoded["role"] != "admin":
            raise HTTPException(403)
    except:
        raise HTTPException(401)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 200")
    logs = cursor.fetchall()
    cursor.close()
    conn.close()

    return logs

#ADMIN LOGS API
@app.get("/api/admin-logs", dependencies=[Depends(security)])
async def get_admin_logs(authorization: str = Depends(security)):

    # AUTH CHECK
    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        if decoded["role"] != "admin":
            raise HTTPException(403)

    except:
        raise HTTPException(401)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM admin_logs
        ORDER BY timestamp DESC
        LIMIT 200
    """)

    logs = cursor.fetchall()

    cursor.close()
    conn.close()

    return logs

# THREAT INTELLIGENCE API
@app.get("/api/threat-intelligence", dependencies=[Depends(security)])
async def threat_intelligence(authorization: str = Depends(security)):

    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )
        if decoded["role"] != "admin":
            raise HTTPException(403)
    except:
        raise HTTPException(401)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Top Threat Types
    cursor.execute("""
        SELECT IFNULL(threat_type,'None') as name, COUNT(*) as value
        FROM logs
        GROUP BY threat_type
        ORDER BY value DESC
    """)
    top_threats = cursor.fetchall()

        # Top Attacking IPs
    cursor.execute("""
        SELECT source_ip, COUNT(*) as count
        FROM logs
        GROUP BY source_ip
        ORDER BY count DESC
        LIMIT 5
    """)
    top_ips = cursor.fetchall()

    # Stats
    cursor.execute("SELECT COUNT(*) as total FROM logs")
    total = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as blocked FROM logs WHERE action='BLOCKED'")
    blocked = cursor.fetchone()["blocked"]

    cursor.execute("SELECT COUNT(*) as allowed FROM logs WHERE action='ALLOWED'")
    allowed = cursor.fetchone()["allowed"]

    cursor.close()
    conn.close()

    return {
        "topThreats": top_threats,
        "topIPs": top_ips,
        "stats": {
            "total": total,
            "blocked": blocked,
            "allowed": allowed
        }
    }

#Traffic API
@app.get("/api/live-traffic", dependencies=[Depends(security)])
async def get_live_traffic(authorization: str = Depends(security)):

    #AUTH CHECK
    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        if decoded["role"] != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")

    except:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # LAST 5 MINUTES TRAFFIC
        cursor.execute("""
            SELECT 
                DATE_FORMAT(timestamp, '%H:%i') AS time,
                COUNT(*) AS requests,
                SUM(CASE WHEN action = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked
            FROM logs
            WHERE timestamp >= NOW() - INTERVAL 5 MINUTE
            GROUP BY time
            ORDER BY time ASC
        """)

        timeseries = cursor.fetchall()

        # CLEAN NULL VALUES (IMPORTANT)
        for row in timeseries:
            if row["blocked"] is None:
                row["blocked"] = 0

        return {
            "timeseries": timeseries
        }

    finally:
        cursor.close()
        conn.close()

# WAF RULES MANAGEMENT API
#to fetch the rules from the database
@app.get("/api/rules", dependencies=[Depends(security)])
async def get_rules(authorization: str = Depends(security)):
    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        if decoded["role"] != "admin":
            raise HTTPException(403)

    except:
        raise HTTPException(401)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM rules ORDER BY id ASC")
    rules = cursor.fetchall()

    cursor.close()
    conn.close()

    return rules

#API to add the rules to the database
@app.post("/api/rules", dependencies=[Depends(security)])
async def add_rule(request: Request, authorization: str = Depends(security)):

    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        if decoded["role"] != "admin":
            raise HTTPException(403)

    except:
        raise HTTPException(401)

    data = await request.json()

    rule_name = data.get("rule_name")
    pattern = data.get("pattern")
    threat_type = data.get("threat_type")
    action = data.get("action", "BLOCK")
    direction = data.get("direction", "INBOUND")

    if not rule_name or not pattern:
        raise HTTPException(400, "Missing rule name or pattern")

    # Validate regex pattern
    import re
    try:
        re.compile(pattern)
    except re.error as e:
        raise HTTPException(400, f"Invalid regex pattern: {str(e)}")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO rules
        (rule_name, pattern, threat_type, action, enabled, direction)
        VALUES (%s,%s,%s,%s,1,%s)
    """, (
        rule_name,
        pattern,
        threat_type,
        action,
        direction
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return {"message": "Rule added successfully"}

#to delete the rules
@app.delete("/api/rules/{rule_id}", dependencies=[Depends(security)])
async def delete_rule(rule_id: int, authorization: str = Depends(security)):

    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        if decoded["role"] != "admin":
            raise HTTPException(403)

    except:
        raise HTTPException(401)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM rules WHERE id=%s",
        (rule_id,)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return {"message": "Rule deleted successfully"}

# API to update an existing rule
@app.put("/api/rules/{rule_id}", dependencies=[Depends(security)])
async def update_rule(rule_id: int, request: Request, authorization: str = Depends(security)):
    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )
        if decoded["role"] != "admin":
            raise HTTPException(403)
    except:
        raise HTTPException(401)

    data = await request.json()
    
    # We can handle both toggle (enabled only) and full edit
    if "enabled" in data and len(data) == 1:
        # This handles the existing toggle logic
        enabled = data.get("enabled")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE rules SET enabled=%s WHERE id=%s", (enabled, rule_id))
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Rule status updated successfully"}
    
    # This handles the full edit
    rule_name = data.get("rule_name")
    pattern = data.get("pattern")
    threat_type = data.get("threat_type")
    action = data.get("action", "BLOCK")

    if not rule_name or not pattern:
        raise HTTPException(400, "Missing rule name or pattern")

    # Validate regex pattern
    import re
    try:
        re.compile(pattern)
    except re.error as e:
        raise HTTPException(400, f"Invalid regex pattern: {str(e)}")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE rules 
        SET rule_name=%s, pattern=%s, threat_type=%s, action=%s
        WHERE id=%s
    """, (rule_name, pattern, threat_type, action, rule_id))

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "Rule updated successfully"}

#Backend Endpoints for Settings
@app.get("/api/settings", dependencies=[Depends(security)])
async def get_waf_settings(authorization: str = Depends(security)):
    """Get current WAF settings"""
    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )
        if decoded["role"] != "admin":
            raise HTTPException(403)
    except:
        raise HTTPException(401)
    
    from waf import RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS
    return {
        "target_app_url": os.getenv("TARGET_SERVER", "http://localhost:8080"),
        "waf_mode": os.getenv("WAF_MODE", "block"),
        "listening_port": 5000,
        "enable_logging": True,
        "rate_limit_max_requests": RATE_LIMIT_MAX_REQUESTS,
        "rate_limit_window_seconds": RATE_LIMIT_WINDOW_SECONDS,
    }

@app.post("/api/settings", dependencies=[Depends(security)])
async def update_waf_settings(request: Request, authorization: str = Depends(security)):
    """Update WAF settings"""
    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )
        if decoded["role"] != "admin":
            raise HTTPException(403)
    except:
        raise HTTPException(401)
    
    data = await request.json()
    target_url = data.get("target_app_url")
    waf_mode = data.get("waf_mode")
    
    # Update environment or database
    # For now, just return success
    return {"message": "Settings updated successfully"}

@app.post("/api/test-connection", dependencies=[Depends(security)])
async def test_backend_connection(request: Request, authorization: str = Depends(security)):
    """Test connectivity to the protected web app"""
    try:
        decoded = jwt.decode(
            authorization.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )
        if decoded["role"] != "admin":
            raise HTTPException(403)
    except:
        raise HTTPException(401)
    
    data = await request.json()
    target_url = data.get("target_url")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(target_url)
            if response.status_code < 500:
                return {"message": f"Connection successful! Status: {response.status_code}"}
            else:
                return {"message": f"Connected but server returned error: {response.status_code}"}
    except httpx.ConnectError:
        raise HTTPException(400, f"Cannot connect to {target_url}. Make sure the web app is running.")
    except Exception as e:
        raise HTTPException(400, f"Connection failed: {str(e)}")
    

# ========== ML MODEL ENDPOINTS ==========
# IMPORTANT: These MUST come before the WAF proxy

@app.get("/api/ml/model-info", dependencies=[Depends(security)])
async def get_model_info(authorization: str = Depends(security)):
    """Get information about both ML models"""
    try:
        # Auth check...
        decoded = jwt.decode(authorization.credentials, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        if decoded["role"] != "admin": raise HTTPException(403)
    except: raise HTTPException(401)
    
    from waf import get_ml_engine
    engine = get_ml_engine()
    if engine:
        return engine.get_info()
    return {"error": "Engine not initialized"}


@app.get("/api/ml/model-metrics", dependencies=[Depends(security)])
async def get_model_metrics(authorization: str = Depends(security)):
    """Get metrics for both models"""
    try:
        decoded = jwt.decode(authorization.credentials, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        if decoded["role"] != "admin": raise HTTPException(403)
    except: raise HTTPException(401)
    
    import joblib
    xgb_metrics_path = os.path.join(os.path.dirname(__file__), 'ml_model', 'xgboost', 'metrics.pkl')
    ae_metrics_path = os.path.join(os.path.dirname(__file__), 'ml_model', 'autoencoders', 'metrics.pkl')
    
    results = {}
    if os.path.exists(xgb_metrics_path):
        results['xgboost'] = joblib.load(xgb_metrics_path)
    if os.path.exists(ae_metrics_path):
        results['autoencoder'] = joblib.load(ae_metrics_path)
        
    return results


# ========== WAF REVERSE PROXY ==========
# IMPORTANT: This MUST be the LAST route
@app.api_route("/{path:path}", methods=[
    "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"
])
async def waf_proxy(request: Request, path: str):
    """
    WAF Reverse Proxy - Intercepts and inspects requests
    """
    # Now inspects ALL methods for better security
    content, status, headers = await inspect_and_proxy(request)
    return Response(content=content, status_code=status, headers=headers)

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)