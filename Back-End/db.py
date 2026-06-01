import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv
import os

load_dotenv()

# Create a connection pool
db_config = {
    "host": os.getenv('DB_HOST'),
    "user": os.getenv('DB_USER'),
    "password": os.getenv('DB_PASSWORD'),
    "database": os.getenv('DB_NAME')
}

connection_pool = pooling.MySQLConnectionPool(
    pool_name="swaf_pool",
    pool_size=5,  # Adjust size based on needs
    pool_reset_session=True,
    **db_config
)

def get_db_connection():
    """Returns a connection from the pool"""
    return connection_pool.get_connection()