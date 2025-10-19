from flask import Blueprint, jsonify, request
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from .model import get_connection, create_tables
import jwt
from datetime import datetime, timedelta

bp = Blueprint("routes", __name__)
JWT_SECRET = os.environ.get("JWT_SECRET")

#create tables when the module is imported
create_tables()

# -------------------------
# Signup
# -------------------------
@bp.route("/signup", methods=["POST"])
def signup():
    data= request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400
    
    name= data.get("name")
    email= data.get("email")
    password= data.get("password")
    role= data.get("role", "farmer")  # default role is farmer
    if not email or not password or not name:
        return jsonify({"message": "Name, email, and password are required"}), 400
    
    hashed_password = generate_password_hash(password)

    conn= get_connection()
    cursor= conn.cursor()

    try:
        if email:
            cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
            existing_user= cursor.fetchone()
            if existing_user:
                return jsonify({"message": "User with this email already exists"}), 400
            
            cursor.execute("""
                          INSERT INTO users (name, email, password, role, created_at)
                            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                            """, (name, email, hashed_password, role))
            
            conn.commit()

    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error creating user", "error": str(e)}), 500
    
    cursor.close()
    conn.close()
    return jsonify({"message": "User created successfully",
                    "user": {
                        "name": name,
                        "email": email,
                        "role": role,
                        "created_at": datetime.utcnow().isoformat() + 'Z'
                    }}), 201


# -------------------------
# Login
# -------------------------
@bp.route("/login", methods=["POST"])
def login():
    data= request.get_json()
    email= data.get("email")
    password_input= data.get("password")

    conn= get_connection()
    cursor= conn.cursor()

    cursor.execute("""
                   SELECT user_id, password, name, role FROM users WHERE email=%s;
                   """, (email,))
    user= cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        return jsonify({"message": "Invalid email or password"}), 401
    
    user_id, password, name, role= user
    if not check_password_hash(password, password_input):
        return jsonify({"message": "Invalid email or password"}), 401 

    # Create JWT token
    token = jwt.encode({
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }, JWT_SECRET, algorithm="HS256")

    return jsonify({"msg": "Login successful", "token": token,
                    "user": {
                        "id": user_id,
                        "name": name,
                        "email": email,
                        "role": role
                    }}), 200