from db import get_db_connection 
from datetime import datetime, timezone
import json 

def log_event(ip, action, rule, device="", attack=""): 
    try: 
        conn = get_db_connection() 
        cursor = conn.cursor() 
        
        # Convert device to headers format 
        headers = json.dumps({"user-agent": device}) 
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
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) 
                """, ( 
                    datetime.now(timezone.utc), 
                    ip, 
                    "AUTH", # request_method 
                    "/login", # request_path 
                    headers, "", # request_body 
                    attack, 
                    action, 
                    rule 
                )) 
        conn.commit() 
        cursor.close() 
        conn.close() 
    except Exception as e: 
        print(f"Error logging event: {e}")