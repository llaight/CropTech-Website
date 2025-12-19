from flask import Blueprint, jsonify, request
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from .model import get_connection, create_tables
import jwt
from datetime import datetime, timedelta
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import requests
from dateutil import parser as date_parser
from math import fabs

# Create blueprint and load JWT secret before defining routes
bp = Blueprint("routes", __name__)
JWT_SECRET = os.environ.get("JWT_SECRET")

# create tables when the module is imported
create_tables()

# geocoder instance used for reverse geocoding
_geolocator = Nominatim(user_agent="croptech-reverse-geocoder")


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
# INVENTORY ENDPOINTS
# -------------------------
@bp.route("/inventory", methods=["POST"])
def create_inventory_item():
    """Create a new inventory item (rice variety) for the authenticated user."""
    # Get user from token
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
    
    # Validate required fields
    name = data.get("name")
    if not name:
        return jsonify({"message": "Rice variety name is required"}), 400

    price_per_unit = data.get("price_per_unit", 0)
    
    # Sack quantities
    sacks_of_grains_25kg = data.get("sacks_of_grains_25kg", 0)
    sacks_of_grains_50kg = data.get("sacks_of_grains_50kg", 0)
    sacks_of_rice_25kg = data.get("sacks_of_rice_25kg", 0)
    sacks_of_rice_50kg = data.get("sacks_of_rice_50kg", 0)
    
    # Condition categories
    grains_condition = data.get("grains_condition", "to sell")
    grains_condition_other = data.get("grains_condition_other", "")
    rice_condition = data.get("rice_condition", "to sell")
    rice_condition_other = data.get("rice_condition_other", "")
    
    # Remarks
    remarks = data.get("remarks", "")
    
    type_val = data.get("type", "rice_variety")

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO inventory (
                name, price_per_unit, 
                sacks_of_grains_25kg, sacks_of_grains_50kg,
                sacks_of_rice_25kg, sacks_of_rice_50kg,
                grains_condition, grains_condition_other,
                rice_condition, rice_condition_other,
                remarks, type, user_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING item_id, created_at;
        """, (
            name, price_per_unit,
            sacks_of_grains_25kg, sacks_of_grains_50kg,
            sacks_of_rice_25kg, sacks_of_rice_50kg,
            grains_condition, grains_condition_other,
            rice_condition, rice_condition_other,
            remarks, type_val, user_id
        ))
        
        row = cursor.fetchone()
        conn.commit()
        
        if not row:
            return jsonify({"message": "Failed to create inventory item"}), 500
            
        item_id, created_at = row
        
        # Convert created_at to ISO string
        try:
            created_iso = created_at.isoformat()
        except Exception:
            created_iso = str(created_at)
            
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error creating inventory item", "error": str(e)}), 500

    cursor.close()
    conn.close()
    
    # Calculate totals for response
    total_sacks_of_grains = sacks_of_grains_25kg + sacks_of_grains_50kg
    total_sacks_of_rice = sacks_of_rice_25kg + sacks_of_rice_50kg
    total_weight_grains_kg = (sacks_of_grains_25kg * 25) + (sacks_of_grains_50kg * 50)
    total_weight_rice_kg = (sacks_of_rice_25kg * 25) + (sacks_of_rice_50kg * 50)
    
    return jsonify({
        "message": "Inventory item created successfully",
        "item": {
            "id": item_id,
            "name": name,
            "price_per_unit": price_per_unit,
            
            # Detailed sack counts
            "sacks_of_grains_25kg": sacks_of_grains_25kg,
            "sacks_of_grains_50kg": sacks_of_grains_50kg,
            "sacks_of_rice_25kg": sacks_of_rice_25kg,
            "sacks_of_rice_50kg": sacks_of_rice_50kg,
            
            # Totals
            "total_sacks_of_grains": total_sacks_of_grains,
            "total_sacks_of_rice": total_sacks_of_rice,
            "total_weight_grains_kg": total_weight_grains_kg,
            "total_weight_rice_kg": total_weight_rice_kg,
            
            # Condition categories
            "grains_condition": grains_condition,
            "grains_condition_other": grains_condition_other,
            "rice_condition": rice_condition,
            "rice_condition_other": rice_condition_other,
            
            # Remarks
            "remarks": remarks,
            
            "type": type_val,
            "user_id": user_id,
            "created_at": created_iso
        }
    }), 201


@bp.route("/inventory", methods=["GET"])
def list_inventory():
    """Get inventory items for the authenticated user."""
    # Get user from token
    auth = request.headers.get("Authorization")
    user_id = None
    
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except Exception:
            user_id = None
    
    # If no token, check for user_id in query params
    if not user_id:
        user_id = request.args.get("user_id")
    
    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        if user_id:
            cursor.execute("""
                SELECT 
                    item_id, name, price_per_unit, 
                    sacks_of_grains_25kg, sacks_of_grains_50kg,
                    sacks_of_rice_25kg, sacks_of_rice_50kg,
                    grains_condition, grains_condition_other,
                    rice_condition, rice_condition_other,
                    remarks, type, user_id, created_at 
                FROM inventory 
                WHERE user_id=%s 
                ORDER BY created_at DESC;
            """, (user_id,))
        else:
            cursor.execute("""
                SELECT 
                    item_id, name, price_per_unit, 
                    sacks_of_grains_25kg, sacks_of_grains_50kg,
                    sacks_of_rice_25kg, sacks_of_rice_50kg,
                    grains_condition, grains_condition_other,
                    rice_condition, rice_condition_other,
                    remarks, type, user_id, created_at 
                FROM inventory 
                ORDER BY created_at DESC;
            """)
        
        rows = cursor.fetchall()
        inventory_items = []
        
        for row in rows:
            (item_id, name, price_per_unit, 
             sacks_of_grains_25kg, sacks_of_grains_50kg,
             sacks_of_rice_25kg, sacks_of_rice_50kg,
             grains_condition, grains_condition_other,
             rice_condition, rice_condition_other,
             remarks, type_val, uid, created_at) = row
            
            # Convert created_at to ISO string
            try:
                created_iso = created_at.isoformat()
            except Exception:
                created_iso = str(created_at)
            
            # Calculate totals
            total_sacks_of_grains = sacks_of_grains_25kg + sacks_of_grains_50kg
            total_sacks_of_rice = sacks_of_rice_25kg + sacks_of_rice_50kg
            total_weight_grains_kg = (sacks_of_grains_25kg * 25) + (sacks_of_grains_50kg * 50)
            total_weight_rice_kg = (sacks_of_rice_25kg * 25) + (sacks_of_rice_50kg * 50)
            
            # Determine display condition
            grains_display_condition = grains_condition
            if grains_condition == "others" and grains_condition_other:
                grains_display_condition = grains_condition_other
            
            rice_display_condition = rice_condition
            if rice_condition == "others" and rice_condition_other:
                rice_display_condition = rice_condition_other
            
            inventory_items.append({
                "id": item_id,
                "name": name,
                "price": price_per_unit,
                
                # Detailed sack counts
                "sacks_of_grains_25kg": sacks_of_grains_25kg,
                "sacks_of_grains_50kg": sacks_of_grains_50kg,
                "sacks_of_rice_25kg": sacks_of_rice_25kg,
                "sacks_of_rice_50kg": sacks_of_rice_50kg,
                
                # Totals
                "total_sacks_of_grains": total_sacks_of_grains,
                "total_sacks_of_rice": total_sacks_of_rice,
                "total_weight_grains_kg": total_weight_grains_kg,
                "total_weight_rice_kg": total_weight_rice_kg,
                
                # Condition categories
                "grains_condition": grains_condition,
                "grains_condition_other": grains_condition_other,
                "grains_display_condition": grains_display_condition,
                "rice_condition": rice_condition,
                "rice_condition_other": rice_condition_other,
                "rice_display_condition": rice_display_condition,
                
                # Remarks
                "remarks": remarks,
                
                "type": type_val,
                "user_id": uid,
                "created_at": created_iso
            })
            
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching inventory", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"inventory": inventory_items}), 200


@bp.route("/inventory/<int:item_id>", methods=["PUT"])
def update_inventory_item(item_id):
    """Update an inventory item."""
    # Get user from token
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
    
    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        # First check if item belongs to user
        cursor.execute("SELECT user_id FROM inventory WHERE item_id=%s", (item_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({"message": "Inventory item not found"}), 404
        
        if row[0] != user_id:
            return jsonify({"message": "Not authorized to update this item"}), 403
        
        # Build update query based on provided fields
        updates = []
        values = []
        
        # Detailed sack counts
        if "sacks_of_grains_25kg" in data:
            updates.append("sacks_of_grains_25kg = %s")
            values.append(data["sacks_of_grains_25kg"])
        
        if "sacks_of_grains_50kg" in data:
            updates.append("sacks_of_grains_50kg = %s")
            values.append(data["sacks_of_grains_50kg"])
        
        if "sacks_of_rice_25kg" in data:
            updates.append("sacks_of_rice_25kg = %s")
            values.append(data["sacks_of_rice_25kg"])
        
        if "sacks_of_rice_50kg" in data:
            updates.append("sacks_of_rice_50kg = %s")
            values.append(data["sacks_of_rice_50kg"])
        
        # Condition categories
        if "grains_condition" in data:
            updates.append("grains_condition = %s")
            values.append(data["grains_condition"])
        
        if "grains_condition_other" in data:
            updates.append("grains_condition_other = %s")
            values.append(data["grains_condition_other"])
        
        if "rice_condition" in data:
            updates.append("rice_condition = %s")
            values.append(data["rice_condition"])
        
        if "rice_condition_other" in data:
            updates.append("rice_condition_other = %s")
            values.append(data["rice_condition_other"])
        
        # Remarks
        if "remarks" in data:
            updates.append("remarks = %s")
            values.append(data["remarks"])
        
        # Basic fields
        if "price_per_unit" in data:
            updates.append("price_per_unit = %s")
            values.append(data["price_per_unit"])
        
        if "name" in data:
            updates.append("name = %s")
            values.append(data["name"])
        
        if updates:
            query = f"UPDATE inventory SET {', '.join(updates)} WHERE item_id = %s RETURNING *"
            values.append(item_id)
            
            cursor.execute(query, tuple(values))
            updated_row = cursor.fetchone()
            conn.commit()
            
            if updated_row:
                # Parse the returned row
                (item_id, name, price_per_unit, 
                 sacks_of_grains_25kg, sacks_of_grains_50kg,
                 sacks_of_rice_25kg, sacks_of_rice_50kg,
                 grains_condition, grains_condition_other,
                 rice_condition, rice_condition_other,
                 remarks, type_val, uid, created_at) = updated_row
                
                # Calculate totals
                total_sacks_of_grains = sacks_of_grains_25kg + sacks_of_grains_50kg
                total_sacks_of_rice = sacks_of_rice_25kg + sacks_of_rice_50kg
                total_weight_grains_kg = (sacks_of_grains_25kg * 25) + (sacks_of_grains_50kg * 50)
                total_weight_rice_kg = (sacks_of_rice_25kg * 25) + (sacks_of_rice_50kg * 50)
                
                try:
                    created_iso = created_at.isoformat()
                except Exception:
                    created_iso = str(created_at)
                
                return jsonify({
                    "message": "Inventory item updated successfully",
                    "item": {
                        "id": item_id,
                        "name": name,
                        "price": price_per_unit,
                        
                        # Detailed sack counts
                        "sacks_of_grains_25kg": sacks_of_grains_25kg,
                        "sacks_of_grains_50kg": sacks_of_grains_50kg,
                        "sacks_of_rice_25kg": sacks_of_rice_25kg,
                        "sacks_of_rice_50kg": sacks_of_rice_50kg,
                        
                        # Totals
                        "total_sacks_of_grains": total_sacks_of_grains,
                        "total_sacks_of_rice": total_sacks_of_rice,
                        "total_weight_grains_kg": total_weight_grains_kg,
                        "total_weight_rice_kg": total_weight_rice_kg,
                        
                        # Condition categories
                        "grains_condition": grains_condition,
                        "grains_condition_other": grains_condition_other,
                        "rice_condition": rice_condition,
                        "rice_condition_other": rice_condition_other,
                        
                        # Remarks
                        "remarks": remarks,
                        
                        "type": type_val,
                        "user_id": uid,
                        "created_at": created_iso
                    }
                }), 200
        
        return jsonify({"message": "No fields to update"}), 400
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error updating inventory item", "error": str(e)}), 500

    cursor.close()
    conn.close()


@bp.route("/inventory/<int:item_id>", methods=["DELETE"])
def delete_inventory_item(item_id):
    """Delete an inventory item."""
    # Get user from token
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return jsonify({"message": "Missing or invalid Authorization header"}), 401

    token = auth.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
    except Exception as e:
        return jsonify({"message": "Invalid token", "error": str(e)}), 401

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        # First check if item belongs to user
        cursor.execute("SELECT user_id FROM inventory WHERE item_id=%s", (item_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({"message": "Inventory item not found"}), 404
        
        if row[0] != user_id:
            return jsonify({"message": "Not authorized to delete this item"}), 403
        
        cursor.execute("DELETE FROM inventory WHERE item_id=%s", (item_id,))
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error deleting inventory item", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"message": "Inventory item deleted successfully"}), 200


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


# -------------------------
# Reverse geocoding endpoint
# -------------------------
@bp.route("/reverse-geocode", methods=["GET"])
def reverse_geocode():
    """Reverse-geocode a latitude/longitude pair and return a city-like name.

    Query params: lat, lon
    Returns JSON: { city: <string|null>, display_name: <string|null> }
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not lat or not lon:
        return jsonify({"message": "lat and lon query parameters are required"}), 400

    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except ValueError:
        return jsonify({"message": "Invalid lat/lon values"}), 400

    try:
        # Use a longer timeout to avoid quick failures (Nominatim default is short)
        loc = _geolocator.reverse((lat_f, lon_f), exactly_one=True, language='en', timeout=10)
        if not loc:
            return jsonify({"city": None, "state": None, "display_name": None}), 200

        raw = getattr(loc, 'raw', {}) or {}
        address = raw.get('address', {}) if isinstance(raw, dict) else {}
        city = (address.get('city') or address.get('town') or address.get('village') or
            address.get('hamlet') or address.get('county') or None)
        # Prefer 'state' but fall back to other region-like fields
        state = address.get('state') or address.get('region') or None
        return jsonify({"city": city, "state": state, "display_name": loc.address}), 200
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        # Don't fail the client - return nulls so UI can render without breaking
        return jsonify({"city": None, "state": None, "display_name": None, "warning": "geocoding_failed", "error": str(e)}), 200
    except Exception as e:
        # For any other unexpected errors, still return nulls rather than a 500
        return jsonify({"city": None, "state": None, "display_name": None, "warning": "geocoding_error", "error": str(e)}), 200


# -------------------------
# Fetch weather from Open-Meteo and store
# -------------------------
@bp.route("/fetch-weather", methods=["POST"])
def fetch_weather_for_location():
    """Fetch current hourly weather from Open-Meteo for lat/lon and store one row in the weather table.

    Accepts JSON body or query params with `lat` and `lon`.
    Returns the inserted weather row on success.
    """
    data = request.get_json(silent=True) or {}
    lat = data.get('lat') or request.args.get('lat')
    lon = data.get('lon') or request.args.get('lon')

    if lat is None or lon is None:
        return jsonify({"message": "lat and lon are required (query params or JSON body)"}), 400

    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except ValueError:
        return jsonify({"message": "Invalid lat/lon values"}), 400

    # Optional field_id to link this weather row to a field (from JSON body or query)
    field_id = None
    try:
        field_id_raw = data.get('field_id') or request.args.get('field_id')
        if field_id_raw is not None:
            field_id = int(field_id_raw)
    except Exception:
        field_id = None

    # Build Open-Meteo hourly request for today
    # Request the set of hourly variables we need
    params = {
        'latitude': lat_f,
        'longitude': lon_f,
        'hourly': ','.join([
            'temperature_2m',
            'relativehumidity_2m',
            'precipitation_probability',
            'precipitation',
            'cloudcover',
            'windspeed_10m',
            'winddirection_10m',
            'weathercode',
        ]),
        'timezone': 'UTC',
        'start_date': datetime.utcnow().date().isoformat(),
        'end_date': datetime.utcnow().date().isoformat(),
    }

    try:
        res = requests.get('https://api.open-meteo.com/v1/forecast', params=params, timeout=10)
        if res.status_code != 200:
            return jsonify({"message": "Open-Meteo request failed", "status_code": res.status_code, "body": res.text}), 502
        payload = res.json()
    except Exception as e:
        return jsonify({"message": "Error contacting Open-Meteo", "error": str(e)}), 502

    hours = payload.get('hourly', {})
    times = hours.get('time', [])

    if not times:
        return jsonify({"message": "No hourly data returned by Open-Meteo"}), 502

    # Choose the hour nearest to now (UTC)
    now = datetime.utcnow()
    best_idx = 0
    best_diff = None
    for i, t in enumerate(times):
        try:
            dt = date_parser.isoparse(t)
            diff = fabs((dt - now).total_seconds())
            if best_diff is None or diff < best_diff:
                best_diff = diff
                best_idx = i
        except Exception:
            continue

    def get_hourly(name):
        arr = hours.get(name, [])
        try:
            return arr[best_idx]
        except Exception:
            return None

    weather_code = get_hourly('weathercode')
    temperature = get_hourly('temperature_2m')
    relative_humidity = get_hourly('relativehumidity_2m')
    precipitation_probability = get_hourly('precipitation_probability')
    precipitation = get_hourly('precipitation')
    cloud_cover = get_hourly('cloudcover')
    wind_speed_10m = get_hourly('windspeed_10m')
    wind_direction_10m = get_hourly('winddirection_10m')

    # Insert into DB (date = date part of the selected hour)
    date_str = None
    try:
        date_str = times[best_idx].split('T')[0]
    except Exception:
        date_str = datetime.utcnow().date().isoformat()

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO weather (date, weather_code, temperature, relative_humidity, precipitation_probability, precipitation, cloud_cover, wind_speed_10m, wind_direction_10m, field_id, location)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING weather_id;
            """,
            (
                date_str,
                int(weather_code) if weather_code is not None else None,
                float(temperature) if temperature is not None else None,
                float(relative_humidity) if relative_humidity is not None else None,
                float(precipitation_probability) if precipitation_probability is not None else None,
                float(precipitation) if precipitation is not None else None,
                float(cloud_cover) if cloud_cover is not None else None,
                float(wind_speed_10m) if wind_speed_10m is not None else None,
                float(wind_direction_10m) if wind_direction_10m is not None else None,
                field_id,
                f"{lat_f},{lon_f}",
            )
        )
        row = cursor.fetchone()
        conn.commit()
        weather_id = row[0] if row else None
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error inserting weather into DB", "error": str(e)}), 500

    cursor.close()
    conn.close()

    return jsonify({
        "weather": {
            "id": weather_id,
            "date": date_str,
            "weather_code": weather_code,
            "temperature": temperature,
            "relative_humidity": relative_humidity,
            "precipitation_probability": precipitation_probability,
            "precipitation": precipitation,
            "cloud_cover": cloud_cover,
            "wind_speed_10m": wind_speed_10m,
            "wind_direction_10m": wind_direction_10m,
            "field_id": field_id,
            "location": f"{lat_f},{lon_f}",
        }
    }), 201