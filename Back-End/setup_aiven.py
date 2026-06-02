import mysql.connector
import os

from dotenv import load_dotenv
load_dotenv()

config = {
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': 'defaultdb',
    'ssl_ca': os.path.join(os.path.dirname(__file__), 'ca.pem'),
    'ssl_verify_identity': True
}

print("Connecting to Aiven MySQL...")

conn = mysql.connector.connect(**config)
print("Connected.")
cursor = conn.cursor()

cursor.execute("CREATE DATABASE IF NOT EXISTS swaf")
cursor.execute("USE swaf")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source_ip VARCHAR(45),
        request_method VARCHAR(10),
        request_path TEXT,
        request_headers TEXT,
        request_body TEXT,
        threat_type VARCHAR(100),
        action VARCHAR(20),
        details TEXT
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rule_name VARCHAR(100),
        pattern TEXT,
        threat_type VARCHAR(50),
        action ENUM('BLOCK','LOG','ALLOW') DEFAULT 'BLOCK',
        enabled TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        admin_username VARCHAR(255),
        action VARCHAR(255),
        status VARCHAR(50),
        ip VARCHAR(45),
        user_agent TEXT
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS ip_reputation (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45) UNIQUE NOT NULL,
        reputation VARCHAR(20) DEFAULT 'clean',
        request_count INT DEFAULT 0,
        threat_count INT DEFAULT 0,
        first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
""")

# Default admin user  (password: admin123)
cursor.execute("""
    INSERT IGNORE INTO users (username, password, role)
    VALUES ('admin', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin')
""")

# Full rule set
rules = [
    ('SQL Injection - Union Select',       r'(?i)(union\s+select)',                                          'SQL Injection',    'BLOCK', 1),
    ('SQL Injection - AND Condition',       r'(?i)(\s+and\s+\d+\s*=\s*\d+)',                                 'SQL Injection',    'BLOCK', 1),
    ('SQL Injection - Comment Injection',   r'(--|#|/\*|\*/)',                                                'SQL Injection',    'BLOCK', 1),
    ('SQL Injection - Sleep Delay',         r'(?i)(sleep\s*\(|waitfor\s+delay|benchmark\s*\()',               'SQL Injection',    'BLOCK', 1),
    ('SQL Injection - Information Schema',  r'(?i)(information_schema)',                                      'SQL Injection',    'BLOCK', 1),
    ('SQL Injection - Drop Table',          r'(?i)(drop\s+table|drop\s+database)',                            'SQL Injection',    'BLOCK', 1),
    ('SQL Injection - Insert Into',         r'(?i)(insert\s+into\s+\w+\s+values)',                            'SQL Injection',    'BLOCK', 1),
    ('SQL Injection - Update Query',        r'(?i)(update\s+\w+\s+set)',                                      'SQL Injection',    'BLOCK', 1),
    ('SQL Injection - Delete Query',        r'(?i)(delete\s+from\s+\w+)',                                     'SQL Injection',    'BLOCK', 1),
    ('SQL Injection - Execute Command',     r'(?i)(exec\s*\(|execute\s*\(|xp_cmdshell)',                      'SQL Injection',    'BLOCK', 1),
    ('XSS - Script Tag',                    r'<script[^>]*>.*?</script>',                                     'XSS',              'BLOCK', 1),
    ('XSS - Image OnError',                 r'<img[^>]+onerror\s*=',                                          'XSS',              'BLOCK', 1),
    ('XSS - Image OnLoad',                  r'<img[^>]+onload\s*=',                                           'XSS',              'BLOCK', 1),
    ('XSS - JavaScript Protocol',           r'javascript:',                                                   'XSS',              'BLOCK', 1),
    ('XSS - Alert Function',                r'alert\s*\(',                                                    'XSS',              'BLOCK', 1),
    ('XSS - Confirm Function',              r'confirm\s*\(',                                                  'XSS',              'BLOCK', 1),
    ('XSS - Prompt Function',               r'prompt\s*\(',                                                   'XSS',              'BLOCK', 1),
    ('XSS - Document Cookie',               r'document\.cookie',                                              'XSS',              'BLOCK', 1),
    ('XSS - Eval Function',                 r'eval\s*\(',                                                     'XSS',              'BLOCK', 1),
    ('XSS - Iframe Injection',              r'<iframe',                                                       'XSS',              'BLOCK', 1),
    ('XSS - Body OnLoad',                   r'<body[^>]+onload\s*=',                                          'XSS',              'BLOCK', 1),
    ('XSS - SVG OnLoad',                    r'<svg[^>]+onload\s*=',                                           'XSS',              'BLOCK', 1),
    ('XSS - HTML Entity Encoded',           r'&#\d+;|&#x[0-9a-fA-F]+;',                                      'XSS',              'BLOCK', 1),
    ('XSS - URL Encoded XSS',               r'%3Cscript%3E|%3C/script%3E|%3Cimg%20',                         'XSS',              'BLOCK', 1),
    ('XSS - VB Script',                     r'vbscript:',                                                     'XSS',              'BLOCK', 1),
    ('Path Traversal - Unix Style',         r'\.\.\/',                                                        'Path Traversal',   'BLOCK', 1),
    ('Path Traversal - Windows Style',      r'\.\.\\',                                                        'Path Traversal',   'BLOCK', 1),
    ('Path Traversal - Encoded',            r'%2e%2e%2f|%252e%252e%252f',                                     'Path Traversal',   'BLOCK', 1),
    ('Path Traversal - Double Encoded',     r'%252e%252e%252f',                                               'Path Traversal',   'BLOCK', 1),
    ('Command Injection - Semicolon',       r';\s*(ls|cat|dir|pwd|whoami|id)',                                 'Command Injection','BLOCK', 1),
    ('Command Injection - Pipe',            r'\|\s*(ls|cat|dir|pwd|whoami|id)',                                'Command Injection','BLOCK', 1),
    ('Command Injection - Backtick',        r'`.*`',                                                          'Command Injection','BLOCK', 1),
    ('Command Injection - Subshell',        r'\$\(.*\)',                                                      'Command Injection','BLOCK', 1),
    ('Command Injection - Wget Curl',       r'(wget|curl)\s+http',                                            'Command Injection','BLOCK', 1),
    ('Malicious Bot - SQLMap',              r'sqlmap',                                                        'Malicious Bot',    'BLOCK', 1),
    ('Malicious Bot - Nmap',                r'nmap',                                                          'Malicious Bot',    'BLOCK', 1),
    ('Malicious Bot - Nikto',               r'nikto',                                                         'Malicious Bot',    'BLOCK', 1),
    ('Malicious Bot - Acunetix',            r'acunetix',                                                      'Malicious Bot',    'BLOCK', 1),
    ('SSRF - Internal IP Access',           r'(https?://(127\.0\.0\.1|localhost|0\.0\.0\.0|169\.254\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.))', 'SSRF', 'BLOCK', 1),
    ('XXE - XML External Entity',           '<!ENTITY\\s+\\S+\\s+SYSTEM\\s+["\\\']+(file|http|https|ftp)://',   'XXE',              'BLOCK', 1),
    ('LFI - Sensitive File Access',         r'(etc/passwd|etc/shadow|etc/hosts|proc/self|win\.ini|boot\.ini|system32/drivers)', 'LFI', 'BLOCK', 1),
]

cursor.executemany("""
    INSERT IGNORE INTO rules (rule_name, pattern, threat_type, action, enabled)
    VALUES (%s, %s, %s, %s, %s)
""", rules)

conn.commit()
print(f"Setup complete. {cursor.rowcount} rules inserted.")

cursor.execute("SHOW TABLES")
print("Tables:", [t[0] for t in cursor.fetchall()])

cursor.close()
conn.close()
