import psycopg2
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env if present. If not, try .env.example in the repository root so
# users who only have the example file still get reasonable defaults.
loaded = load_dotenv()
env_example = Path(__file__).resolve().parents[1] / '.env.example'
if not loaded and env_example.exists():
        load_dotenv(env_example)
        print(f"Loaded environment variables from {env_example}")
elif not loaded:
        print("No .env file found. Copy '.env.example' to '.env' or set environment variables for the database.")

def get_connection():
    try:
                db_host = os.getenv("DB_HOST")
                db_port = os.getenv("DB_PORT")
                db_name = os.getenv("DB_NAME")
                db_user = os.getenv("DB_USER")
                db_password = os.getenv("DB_PASSWORD")

                if not all([db_host, db_port, db_name, db_user]):
                        print("Missing one or more required DB environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER).")

                if not db_password:
                        print("DB_PASSWORD not set — psycopg2 will fail to authenticate without a password.\n"
                                  "Make sure you have a .env file or set the DB_PASSWORD environment variable.")

                conn = psycopg2.connect(
                        host=db_host,
                        port=db_port,
                        database=db_name,
                        user=db_user,
                        password=db_password
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
    
    # field table 
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS fields(
                   field_id SERIAL PRIMARY KEY,
                   location TEXT NOT NULL,
                   user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE
                  )
            """)

    #weather data table (created after fields so FK can reference fields)
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS weather(
                   weather_id SERIAL PRIMARY KEY,
                   date DATE NOT NULL,
                   weather_code INT,
                   temperature FLOAT,
                   relative_humidity FLOAT,
                   precipitation_probability FLOAT,
                   precipitation FLOAT,
                   cloud_cover FLOAT,
                   wind_speed_10m FLOAT,
                   wind_direction_10m FLOAT,
                   field_id INTEGER REFERENCES fields(field_id) ON DELETE CASCADE,
                   location TEXT
                   )
            """)
    # Ensure columns exist for existing tables (handle upgrades/migrations)
    # ALTER TABLE ADD COLUMN IF NOT EXISTS is supported in modern Postgres
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS weather_code INT;")
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS temperature FLOAT;")
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS relative_humidity FLOAT;")
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS precipitation_probability FLOAT;")
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS precipitation FLOAT;")
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS cloud_cover FLOAT;")
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS wind_speed_10m FLOAT;")
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS wind_direction_10m FLOAT;")
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS field_id INTEGER;")
    cursor.execute("ALTER TABLE weather ADD COLUMN IF NOT EXISTS location TEXT;")
    # Ensure foreign key constraint for field_id exists if possible (skip if already present)
    # Note: adding FK constraints via ALTER while avoiding duplicates is more involved; keep simple for now
    
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
    

    