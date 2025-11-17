from flask import Blueprint, jsonify, request
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from .model import get_connection, create_tables
import jwt
from datetime import datetime, timedelta

# Create blueprint and load JWT secret before defining routes
bp = Blueprint("routes", __name__)
JWT_SECRET = os.environ.get("JWT_SECRET")

# create tables when the module is imported
create_tables()


# -------------------------
# Change password
# -------------------------
@bp.route("/change-password", methods=["POST"])
def change_password():
    # Expect Authorization: Bearer <token>
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
    except Exception as e:
        return jsonify({"message": "Invalid token", "error": str(e)}), 401

    data = request.get_json() or {}
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not new_password:
        return jsonify({"message": "New password is required"}), 400

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password FROM users WHERE user_id=%s", (user_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"message": "User not found"}), 404

        stored_hash = row[0]

        # If user has a stored password, require current password match
        if stored_hash:
            if not current_password:
                return jsonify({"message": "Current password is required"}), 400
            if not check_password_hash(stored_hash, current_password):
                return jsonify({"message": "Current password is incorrect"}), 401

        new_hash = generate_password_hash(new_password)
        cursor.execute("UPDATE users SET password=%s WHERE user_id=%s", (new_hash, user_id))
        conn.commit()
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error updating password", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"message": "Password updated successfully"}), 200

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


# -------------------------
# List users 
# -------------------------
@bp.route("/users", methods=["GET"])
def list_users():
    """Return a list of registered users (omits password).

    WARNING: This endpoint is intended for local development and debugging only.
    Do NOT expose it in production without proper authentication and authorization.
    """
    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id, name, email, role, created_at FROM users;")
        rows = cursor.fetchall()
        users = []
        for row in rows:
            user_id, name, email, role, created_at = row
            # Convert created_at to ISO string if it's a datetime
            try:
                created_iso = created_at.isoformat()
            except Exception:
                created_iso = str(created_at)

            users.append({
                "id": user_id,
                "name": name,
                "email": email,
                "role": role,
                "created_at": created_iso,
            })

    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching users", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"users": users}), 200


# -------------------------
# Fields endpoints
# -------------------------
@bp.route("/fields", methods=["POST"]) 
def create_field():
    data = request.get_json() or {}
    location = data.get("location")

    if not location:
        return jsonify({"message": "Field location is required"}), 400

    # Try to get user_id from token if provided
    auth = request.headers.get("Authorization")
    user_id = None
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except Exception:
            # ignore token errors for now; proceed if user_id provided in body
            user_id = None

    if not user_id:
        user_id = data.get("user_id")

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO fields (location, user_id) VALUES (%s, %s) RETURNING field_id;", (location, user_id))
        row = cursor.fetchone()
        conn.commit()
        field_id = row[0] if row else None
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error creating field", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"field": {"id": field_id, "location": location, "user_id": user_id}}), 201


@bp.route("/fields", methods=["GET"]) 
def list_fields():
    # Optional query params: user_id
    q_user = request.args.get("user_id")

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        if q_user:
            cursor.execute("SELECT field_id, location, user_id FROM fields WHERE user_id=%s;", (q_user,))
        else:
            cursor.execute("SELECT field_id, location, user_id FROM fields;")
        rows = cursor.fetchall()
        fields = []
        for row in rows:
            fid, location, uid = row
            fields.append({"id": fid, "location": location, "user_id": uid})
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching fields", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"fields": fields}), 200


# -------------------------
# Crops endpoints
# -------------------------
@bp.route("/crops", methods=["POST"]) 
def create_crop():
    data = request.get_json() or {}
    name = data.get("name")
    health_status = data.get("health_status")
    planting_date = data.get("planting_date")  # expect YYYY-MM-DD or None
    field_id = data.get("field_id")

    if not name:
        return jsonify({"message": "Crop name is required"}), 400

    # user association from token if provided
    auth = request.headers.get("Authorization")
    user_id = None
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except Exception:
            user_id = None

    if not user_id:
        user_id = data.get("user_id")

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO crops (name, health_status, planting_date, user_id, field_id) VALUES (%s, %s, %s, %s, %s) RETURNING crop_id;",
            (name, health_status, planting_date, user_id, field_id),
        )
        row = cursor.fetchone()
        conn.commit()
        crop_id = row[0] if row else None
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error creating crop", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"crop": {"id": crop_id, "name": name, "health_status": health_status, "planting_date": planting_date, "user_id": user_id, "field_id": field_id}}), 201


@bp.route("/crops", methods=["GET"]) 
def list_crops():
    q_user = request.args.get("user_id")
    q_field = request.args.get("field_id")

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        if q_user and q_field:
            cursor.execute("SELECT crop_id, name, health_status, planting_date, user_id, field_id FROM crops WHERE user_id=%s AND field_id=%s;", (q_user, q_field))
        elif q_user:
            cursor.execute("SELECT crop_id, name, health_status, planting_date, user_id, field_id FROM crops WHERE user_id=%s;", (q_user,))
        elif q_field:
            cursor.execute("SELECT crop_id, name, health_status, planting_date, user_id, field_id FROM crops WHERE field_id=%s;", (q_field,))
        else:
            cursor.execute("SELECT crop_id, name, health_status, planting_date, user_id, field_id FROM crops;")

        rows = cursor.fetchall()
        crops = []
        for row in rows:
            cid, name, health_status, planting_date, uid, fid = row
            crops.append({
                "id": cid,
                "name": name,
                "health_status": health_status,
                "planting_date": planting_date.isoformat() if planting_date else None,
                "user_id": uid,
                "field_id": fid,
            })
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching crops", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"crops": crops}), 200