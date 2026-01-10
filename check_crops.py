import psycopg2
import os
from dotenv import load_dotenv
from pathlib import Path

loaded = load_dotenv()
env_example = Path('.env.example').resolve()
if not loaded and env_example.exists():
    load_dotenv(env_example)

def get_connection():
    try:
        db_host = os.getenv("DB_HOST")
        db_port = os.getenv("DB_PORT")
        db_name = os.getenv("DB_NAME")
        db_user = os.getenv("DB_USER")
        db_password = os.getenv("DB_PASSWORD")
        
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        return conn
    except Exception as e:
        print(f"Connection failed: {e}")
        return None

conn = get_connection()
if conn:
    cursor = conn.cursor()
    print("\n=== CROPS TABLE ===")
    cursor.execute('SELECT crop_id, name, planting_date, field_id, health_status FROM crops;')
    rows = cursor.fetchall()
    if rows:
        for row in rows:
            print(f"ID: {row[0]}, Name: {row[1]}, Planting Date: {row[2]}, Field: {row[3]}, Health: {row[4]}")
    else:
        print("No crops found")
    
    print("\n=== FIELDS TABLE ===")
    cursor.execute('SELECT field_id, location, user_id FROM fields;')
    fields = cursor.fetchall()
    if fields:
        for f in fields:
            print(f"Field ID: {f[0]}, Location: {f[1]}, User: {f[2]}")
    else:
        print("No fields found")
    
    cursor.close()
    conn.close()
else:
    print("Failed to connect to database")
