import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )
        print("Connected successfully!")
        return conn
    except Exception as e:
        print(f"Connection failed: {e}")
        return None

def create_tables():
    conn= get_connection()
    if conn is None:
        print("Cannot create tables without a database connection.")
        return 
    
    cursor = conn.cursor()

    # user table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS users(
                   user_id SERIAL PRIMARY KEY,
                   name TEXT NOT NULL,
                   role TEXT NOT NULL,
                   email TEXT UNIQUE NOT NULL,
                   password TEXT NOT NULL,
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   )
            """)
    
    #weather data table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS weather(
                   weather_id SERIAL PRIMARY KEY,
                   date DATE NOT NULL,
                   temperature FLOAT,
                   rainfall FLOAT,
                   location TEXT
                   )
            """)
    
    # field table 
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS fields(
                   field_id SERIAL PRIMARY KEY,
                   location TEXT NOT NULL,
                   user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE
                  )
            """)
    
    # inventory table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory(
                   item_id SERIAL PRIMARY KEY,
                   name TEXT NOT NULL,
                   quantity INTEGER DEFAULT 0,
                   type TEXT,
                   user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE
                   )       
            """)
    
    # crops table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS crops(
                   crop_id SERIAL PRIMARY KEY,
                   name TEXT NOT NULL,
                   health_status TEXT,
                   planting_date DATE,
                   user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                   field_id INTEGER REFERENCES fields(field_id) ON DELETE CASCADE
                   )       
            """)
    
    # marketprice table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS marketprice(
                   price_id SERIAL PRIMARY KEY,
                   crop_name TEXT NOT NULL,
                   price_per_kg FLOAT,
                   date DATE,
                   crop_id INTEGER REFERENCES crops(crop_id) ON DELETE CASCADE
                   )       
            """)
    
    # soiltest table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS soiltest(
                   test_id SERIAL PRIMARY KEY,
                   ph_level FLOAT,
                   nutrients TEXT,
                   field_id INTEGER REFERENCES fields(field_id) ON DELETE CASCADE
                   )       
            """)
    
    # synclog table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS synclog(
                   sync_id SERIAL PRIMARY KEY,
                   user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                   sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                   status TEXT
                   )       
            """)
    
    conn.commit()
    cursor.close()
    conn.close()
    

    