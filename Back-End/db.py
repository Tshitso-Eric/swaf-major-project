import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv
import os

load_dotenv()

db_config = {
    "host": os.getenv('DB_HOST'),
    "port": int(os.getenv('DB_PORT', '3306')),
    "user": os.getenv('DB_USER'),
    "password": os.getenv('DB_PASSWORD'),
    "database": os.getenv('DB_NAME'),
}

# Enable SSL when DB_USE_SSL=true (required for Aiven)
if os.getenv('DB_USE_SSL', 'false').lower() == 'true':
    ssl_ca = os.getenv('DB_SSL_CA', os.path.join(os.path.dirname(__file__), 'ca.pem'))
    db_config['ssl_ca'] = ssl_ca
    db_config['ssl_verify_identity'] = True

connection_pool = pooling.MySQLConnectionPool(
    pool_name="swaf_pool",
    pool_size=5,
    pool_reset_session=True,
    **db_config
)

def get_db_connection():
    """Returns a connection from the pool"""
    return connection_pool.get_connection()