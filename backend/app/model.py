import psycopg2
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env if present. If not, try .env.example in the repository root
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
                        print("DB_PASSWORD not set — psycopg2 will fail to authenticate without a password.")

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
                   name TEXT,
                   location TEXT NOT NULL,
                   user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                   area_ha FLOAT,
                   status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied'))
                  )
            """)

    # Add columns for existing deployments
    cursor.execute("ALTER TABLE fields ADD COLUMN IF NOT EXISTS name TEXT;")
    cursor.execute("ALTER TABLE fields ADD COLUMN IF NOT EXISTS area_ha FLOAT;")
    cursor.execute("ALTER TABLE fields ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';")
    cursor.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fields_status_check'
            ) THEN
                ALTER TABLE fields
                ADD CONSTRAINT fields_status_check CHECK (status IN ('available', 'occupied'));
            END IF;
        END$$;
    """)

    #weather data table
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
    # ALTER TABLE ADD COLUMN IF NOT EXISTS
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

    # inventory table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory(
                   item_id SERIAL PRIMARY KEY,
                   name TEXT NOT NULL,
                   price_per_unit FLOAT DEFAULT 0,
                   
                   -- Grains: 25kg and 50kg sacks
                   sacks_of_grains_25kg INTEGER DEFAULT 0,
                   sacks_of_grains_50kg INTEGER DEFAULT 0,
                   
                   -- Rice: 25kg and 50kg sacks
                   sacks_of_rice_25kg INTEGER DEFAULT 0,
                   sacks_of_rice_50kg INTEGER DEFAULT 0,
                   
                   -- Condition categories - UPDATED: Removed "others" option
                   grains_condition TEXT DEFAULT 'to store' CHECK (grains_condition IN ('to store', 'to plant', 'to dispose')),
                   grains_condition_other TEXT,
                   rice_condition TEXT DEFAULT 'to store' CHECK (rice_condition IN ('to store', 'to sell', 'to dispose')),
                   rice_condition_other TEXT,
                   
                   -- Planting specific - UPDATED: Now have separate counts for 25kg and 50kg
                   grains_to_plant_sacks_25kg INTEGER DEFAULT 0,
                   grains_to_plant_sacks_50kg INTEGER DEFAULT 0,
                   
                   -- General remarks/notes
                   remarks TEXT,
                   
                   type TEXT,
                   user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   )       
            """)
    
    # Add missing columns for existing deployments
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sacks_of_grains_25kg INTEGER DEFAULT 0;")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sacks_of_grains_50kg INTEGER DEFAULT 0;")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sacks_of_rice_25kg INTEGER DEFAULT 0;")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sacks_of_rice_50kg INTEGER DEFAULT 0;")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grains_condition TEXT DEFAULT 'to store';")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grains_condition_other TEXT;")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS rice_condition TEXT DEFAULT 'to store';")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS rice_condition_other TEXT;")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grains_to_plant_sacks_25kg INTEGER DEFAULT 0;")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grains_to_plant_sacks_50kg INTEGER DEFAULT 0;")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS remarks TEXT;")
    cursor.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS type TEXT;")
    
    # crops table
    cursor.execute("""
             CREATE TABLE IF NOT EXISTS crops(
                     crop_id SERIAL PRIMARY KEY,
                     name TEXT NOT NULL,
                     health_status TEXT,
                     planting_date DATE,
                     expected_harvest_date DATE,
                     actual_harvest_date DATE,
                     expected_yield_kg FLOAT,
                     actual_yield_kg FLOAT,
                     planted_grain_kg FLOAT,
                     notes TEXT,
                     user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                     field_id INTEGER REFERENCES fields(field_id) ON DELETE CASCADE
                     )       
             """)
    
    # Add missing columns for existing deployments
    cursor.execute("ALTER TABLE crops ADD COLUMN IF NOT EXISTS expected_harvest_date DATE;")
    cursor.execute("ALTER TABLE crops ADD COLUMN IF NOT EXISTS actual_harvest_date DATE;")
    cursor.execute("ALTER TABLE crops ADD COLUMN IF NOT EXISTS expected_yield_kg FLOAT;")
    cursor.execute("ALTER TABLE crops ADD COLUMN IF NOT EXISTS actual_yield_kg FLOAT;")
    cursor.execute("ALTER TABLE crops ADD COLUMN IF NOT EXISTS planted_grain_kg FLOAT;")
    cursor.execute("ALTER TABLE crops ADD COLUMN IF NOT EXISTS notes TEXT;")

    # crop harvest history table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS crop_harvest_history(
                   harvest_id SERIAL PRIMARY KEY,
                   crop_id INTEGER REFERENCES crops(crop_id) ON DELETE SET NULL,
                   field_id INTEGER REFERENCES fields(field_id) ON DELETE SET NULL,
                   user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                   crop_name TEXT NOT NULL,
                   planting_date DATE,
                   expected_harvest_date DATE,
                   actual_harvest_date DATE,
                   expected_yield_kg FLOAT,
                   actual_yield_kg FLOAT,
                   notes TEXT,
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   )       
            """)

    # Add columns for existing deployments
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS crop_id INTEGER;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS field_id INTEGER;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS user_id INTEGER;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS crop_name TEXT;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS planting_date DATE;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS expected_harvest_date DATE;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS actual_harvest_date DATE;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS expected_yield_kg FLOAT;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS actual_yield_kg FLOAT;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS notes TEXT;")
    cursor.execute("ALTER TABLE crop_harvest_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
    
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
    
    # delivery table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS delivery(
                   delivery_id SERIAL PRIMARY KEY,
                   user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                   delivery_date DATE NOT NULL,
                     delivery_time TIME DEFAULT '09:00:00',
                   recipient TEXT NOT NULL,
                   destination TEXT NOT NULL,
                   method TEXT NOT NULL CHECK (method IN ('delivery', 'pick-up')),
                   status TEXT NOT NULL CHECK (status IN ('to be delivered', 'delivered', 'cancelled', 'returned')),
                   notes TEXT,
                   total_quantity_kg FLOAT,
                   total_revenue_php FLOAT DEFAULT 0,
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   )
            """)
    
    # Add delivery_time and total_revenue_php columns for existing deployments
    cursor.execute("ALTER TABLE delivery ADD COLUMN IF NOT EXISTS delivery_time TIME DEFAULT '09:00:00';")
    cursor.execute("ALTER TABLE delivery ADD COLUMN IF NOT EXISTS total_revenue_php FLOAT DEFAULT 0;")
    
    # delivery items table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS delivery_item(
                   item_id SERIAL PRIMARY KEY,
                   delivery_id INTEGER REFERENCES delivery(delivery_id) ON DELETE CASCADE,
                   variety TEXT NOT NULL,
                   sack_size_kg INTEGER NOT NULL CHECK (sack_size_kg IN (25, 50)),
                   sacks INTEGER NOT NULL,
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   )
            """)
    
    # security_settings table
    cursor.execute("""
            CREATE TABLE IF NOT EXISTS security_settings(
                   security_id SERIAL PRIMARY KEY,
                   user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
                   two_factor_auth BOOLEAN DEFAULT FALSE,
                   session_timeout INTEGER DEFAULT 30,
                   save_login BOOLEAN DEFAULT FALSE,
                   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                   )
            """)
    
    conn.commit()
    cursor.close()
    conn.close()