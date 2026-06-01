from db import get_db_connection
from datetime import datetime

def log_admin_action(username, action, status, ip, user_agent):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO admin_logs (
                timestamp,
                admin_username,
                action,
                status,
                ip,
                user_agent
            ) VALUES (%s,%s,%s,%s,%s,%s)
        """, (
            datetime.now(),
            username,
            action,
            status,
            ip,
            user_agent
        ))

        conn.commit()
    finally:
        cursor.close()
        conn.close()