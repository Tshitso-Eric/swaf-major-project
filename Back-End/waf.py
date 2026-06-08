from __future__ import annotations
from typing import Tuple, Dict, List
from fastapi import Request, HTTPException
from urllib.parse import urlparse, urlunparse
from db import get_db_connection
from datetime import datetime, timezone
from ml_model.ml_engine import HybridMLEngine
from collections import deque

import re
import httpx
import json
import os
import time
import threading

# The protected backend web application
TARGET_URL = os.getenv("TARGET_SERVER", "https://eloan-system-api.onrender.com").rstrip("/")

# Initialize ML Model
ML_ENGINE = None
RULES_CACHE = None
LAST_LOAD = 0.0
CACHE_TTL_SECONDS = 60

# --- Rate Limiting ---
# Sliding-window: max RATE_LIMIT_MAX_REQUESTS per IP within RATE_LIMIT_WINDOW_SECONDS
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX", "100"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
_rate_buckets: Dict[str, deque] = {}   # ip -> deque of timestamps
_rate_lock = threading.Lock()

def is_rate_limited(ip: str) -> bool:
    now = time.monotonic()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    with _rate_lock:
        bucket = _rate_buckets.setdefault(ip, deque())
        # drop timestamps outside the window
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
            return True
        bucket.append(now)
        return False

def invalidate_rules_cache():
    """Call this after any rule add/edit/delete so changes take effect immediately."""
    global RULES_CACHE, LAST_LOAD
    RULES_CACHE = None
    LAST_LOAD   = 0.0


def get_ml_engine():
    global ML_ENGINE
    if ML_ENGINE is None:
        try:
            ML_ENGINE = HybridMLEngine()
        except Exception as e:
            print(f"[ERROR] Failed to load ML engine: {e}")
    return ML_ENGINE

async def load_rules() -> List[dict]:
    global RULES_CACHE, LAST_LOAD
    current_time = time.time()
    if RULES_CACHE is not None and (current_time - LAST_LOAD) < CACHE_TTL_SECONDS:
        return RULES_CACHE

    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, rule_name, pattern, threat_type, action FROM rules WHERE enabled = 1")
        rules = cursor.fetchall()
        
        # Pre-compile regex patterns for performance and catch errors early
        for rule in rules:
            pattern = rule.get("pattern")
            if pattern:
                try:
                    rule["_compiled"] = re.compile(pattern, re.IGNORECASE)
                except re.error as e:
                    print(f"[ERROR] Invalid regex pattern in DB (ID {rule['id']}): {pattern} - {e}")
                    rule["_compiled"] = None
            else:
                rule["_compiled"] = None
                
        RULES_CACHE = rules
        LAST_LOAD = current_time
        return rules
    finally:
        cursor.close()
        conn.close()

def match_rules(content: str, rules: List[dict]) -> List[dict]:
    matched = []
    for rule in rules:
        compiled_pattern = rule.get("_compiled")
        if compiled_pattern and compiled_pattern.search(content):
            matched.append(rule)
    return matched

async def predict_with_ml(request: Request, body_str: str, headers_str: str) -> Tuple[str, float, str]:
    engine = get_ml_engine()
    if engine is None or not engine.is_ready:
        return "ALLOW", 0.0, None
    try:
        request_data = {
            'method': request.method,
            'request_headers': headers_str,
            'body': body_str,
            'source_ip': request.client.host,
            'source_port': request.client.port,
            'url': str(request.url)
        }
        return engine.predict(request_data)
    except Exception as e:
        print(f"[ERROR] ML error: {e}")
        return "ALLOW", 0.0, None

async def hybrid_detection(request: Request, inspect_text: str, body_str: str, headers_str: str, rules: List[dict]) -> Tuple[str, str, str]:
    # 1. Rules
    request_matched = match_rules(inspect_text, rules)
    block_rules = [r for r in request_matched if r["action"] == "BLOCK"]
    if block_rules:
        threat_types = ",".join(set(r["threat_type"] for r in request_matched))
        return "BLOCKED", threat_types, f"Rule Match: {threat_types}"
    
    # 2. ML
    ml_action, ml_score, ml_threat = await predict_with_ml(request, body_str, headers_str)
    if ml_action == "BLOCK":
        return "BLOCKED", ml_threat, f"ML Detection: {ml_threat} (Score: {ml_score:.4f})"
    
    return "ALLOWED", None, None


# Paths served by the SWAF API itself — skip WAF inspection for these
_SWAF_API_PREFIXES = (
    "/login", "/logs", "/api/", "/docs", "/openapi",
)


async def inspect_and_proxy(request: Request) -> Tuple[bytes, int, Dict[str, str]]:
    client_ip = request.client.host

    # Rate limit check — runs before any other inspection
    if is_rate_limited(client_ip):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO logs (timestamp, source_ip, request_method, request_path,
                                  request_headers, request_body, threat_type, action, details)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                datetime.now(timezone.utc), client_ip, request.method, str(request.url),
                "", "", "Rate Limit", "BLOCKED",
                f"Exceeded {RATE_LIMIT_MAX_REQUESTS} req/{RATE_LIMIT_WINDOW_SECONDS}s"
            ))
            conn.commit()
        except Exception as e:
            print(f"[ERROR] Rate-limit log error: {e}")
        finally:
            cursor.close()
            conn.close()
        print(f"[BLOCKED] Rate limit exceeded for {client_ip}")
        return b"Too Many Requests", 429, {"Content-Type": "text/plain", "X-WAF-Status": "RateLimited"}

    rules = await load_rules()

    # Prepare data
    body_bytes = await request.body()
    body_str   = body_bytes.decode("utf-8", errors="ignore")
    headers_dict = dict(request.headers)
    headers_str  = json.dumps(headers_dict)

    # Only inspect headers that can carry attacker-controlled values.
    # Standard browser headers like Accept, Accept-Encoding, Host are safe
    # and cause false positives (e.g. Accept: */*  triggers SQL comment rule).
    _INSPECT_HEADERS = {
        "user-agent", "referer", "x-forwarded-for", "x-real-ip",
        "cookie", "x-custom-header", "x-api-key",
    }
    inspectable_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() in _INSPECT_HEADERS
    }

    # URL-decode the query string so patterns like \s+ match UNION+SELECT
    from urllib.parse import unquote_plus
    decoded_query = unquote_plus(request.url.query) if request.url.query else ""
    path_and_query = request.url.path + (f"?{decoded_query}" if decoded_query else "")
    inspect_text   = f"{path_and_query} {json.dumps(inspectable_headers)} {body_str}"
    
    # Detect
    action, threat_types, details = await hybrid_detection(request, inspect_text, body_str, headers_str, rules)
    
    # Handle None values for database insertion
    threat_types_safe = threat_types if threat_types else "None"
    details_safe = details if details else ""
    
    # Log to DB - FIXED: Removed dest_ip and port_number (columns don't exist in your table)
    conn = get_db_connection()
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO logs (
                timestamp, 
                source_ip, 
                request_method, 
                request_path, 
                request_headers, 
                request_body, 
                threat_type, 
                action, 
                details
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            datetime.now(timezone.utc), 
            request.client.host, 
            request.method, 
            str(request.url), 
            headers_str[:1000], 
            body_str[:1000], 
            threat_types_safe, 
            action, 
            details_safe
        ))
        conn.commit()
        print(f"[OK] Log saved: {action} - {threat_types_safe} from {request.client.host}")
        
    except Exception as e:
        print(f"[ERROR] Log Error: {e}")
        print(f"   Request: {request.method} {request.url}")
        print(f"   Client: {request.client.host}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    if action == "BLOCKED":
        print(f"[BLOCKED] Request BLOCKED: {threat_types_safe} from {request.client.host}")
        return f"BLOCKED: {threat_types_safe}".encode(), 403, {"Content-Type": "text/plain", "X-WAF-Status": "Blocked"}

    # Proxy request
    print(f"[ALLOWED] Request ALLOWED: {request.method} {request.url.path} from {request.client.host}")
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        try:
            forward_url = f"{TARGET_URL}{request.url.path}"
            if request.url.query: 
                forward_url += f"?{request.url.query}"
            
            headers_to_forward = {k: v for k, v in headers_dict.items() if k.lower() not in ["host", "content-length"]}
            headers_to_forward["host"] = urlparse(TARGET_URL).netloc
            
            resp = await client.request(
                method=request.method,
                url=forward_url,
                headers=headers_to_forward,
                content=body_bytes
            )
            return resp.content, resp.status_code, dict(resp.headers)
        except Exception as e:
            print(f"[ERROR] Proxy Error: {e}")
            html = b"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Protected by SWAF</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%);
      font-family: 'Segoe UI', sans-serif;
      color: white;
    }
    .card {
      text-align: center;
      padding: 56px 48px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      backdrop-filter: blur(12px);
      max-width: 480px;
      width: 90%;
    }
    .shield {
      width: 80px; height: 80px;
      background: linear-gradient(135deg, #1d4ed8, #06b6d4);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 28px;
      font-size: 36px;
    }
    h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 12px; }
    .badge {
      display: inline-block;
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.4);
      color: #10b981;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 4px 14px;
      border-radius: 999px;
      margin-bottom: 24px;
    }
    p {
      color: rgba(255,255,255,0.6);
      font-size: 0.95rem;
      line-height: 1.7;
      margin-bottom: 32px;
    }
    .retry {
      display: inline-block;
      padding: 12px 32px;
      background: linear-gradient(135deg, #1d4ed8, #06b6d4);
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s;
    }
    .retry:hover { opacity: 0.85; }
    .footer {
      margin-top: 32px;
      font-size: 0.75rem;
      color: rgba(255,255,255,0.25);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="shield">&#128737;</div>
    <div class="badge">&#9679; SWAF ACTIVE</div>
    <h1>Service Temporarily Unavailable</h1>
    <p>
      The eLoan application is currently unreachable.<br/>
      Your connection is still <strong style="color:white">protected by SWAF</strong>
      &mdash; Smart Web Application Firewall.
    </p>
    <button class="retry" onclick="location.reload()">Try Again</button>
    <div class="footer">SWAF &mdash; Smart Web Application Firewall &bull; swafff.duckdns.org</div>
  </div>
</body>
</html>"""
            return html, 502, {"Content-Type": "text/html; charset=utf-8"}
