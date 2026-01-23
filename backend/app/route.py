from flask import Blueprint, jsonify, request
import os
import json
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
from datetime import date

# Create blueprint and load JWT secret before defining routes
bp = Blueprint("routes", __name__)
JWT_SECRET = os.environ.get("JWT_SECRET")

# create tables when the module is imported
create_tables()

# geocoder instance used for reverse geocoding
_geolocator = Nominatim(user_agent="croptech-reverse-geocoder")


def compute_crop_health(planting_date_str):
    """
    Derive health status and notes from crop age (in months) based on a simple rule set:
      - <= 1 month: Planted / Newly planted rice; early establishment stage
      - <= 2 months: Growing / Active vegetative growth and tillering stage
      - <= 3 months: Ready for Harvest / Grain filling to maturity; harvest preparation
      - > 3 months: Ready for Harvest / Grain filling to maturity; harvest preparation (assume overdue)
    Returns (status, note). If planting_date_str is falsy or invalid, returns (None, None).
    """
    if not planting_date_str:
        return None, None

    try:
        planted = date.fromisoformat(str(planting_date_str))
    except Exception:
        return None, None

    today = date.today()
    diff_days = (today - planted).days

    if diff_days < 0:
        # Future planting date; treat as planted but not started
        return "Planted", "Planting date is in the future; awaiting establishment"

    # Convert to rough months
    months = diff_days / 30.44

    if months <= 1:
        return "Planted", "Newly planted rice; early establishment stage"
    if months <= 2:
        return "Growing", "Active vegetative growth and tillering stage"
    # 3 months and beyond
    return "Ready for Harvest", "Grain filling to maturity; harvest preparation"


def calculate_delivery_revenue(user_id: int, items: list, conn) -> float:
    """Calculate total revenue for a delivery based on inventory prices and item quantities.
    
    Returns total revenue in PHP.
    """
    total_revenue = 0.0
    cursor = conn.cursor()
    
    try:
        for item in items:
            variety = item.get("variety")
            sack_size = item.get("sack_size_kg", 50)
            sacks = item.get("sacks", 0)
            
            # Look up price from inventory
            cursor.execute("""
                SELECT price_per_unit FROM inventory WHERE user_id = %s AND name = %s LIMIT 1;
            """, (user_id, variety))
            
            row = cursor.fetchone()
            price_per_unit = row[0] if row else 0
            
            # Calculate revenue: price_per_unit * total_kg
            # Assuming price_per_unit is per kg
            total_kg = sack_size * sacks
            revenue = price_per_unit * total_kg
            total_revenue += revenue
    except Exception as e:
        print(f"Error calculating delivery revenue: {e}")
    
    return total_revenue


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
    """Return a list of registered users (omits password)."""
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
    grains_condition = data.get("grains_condition", "to store")
    grains_condition_other = data.get("grains_condition_other", "")
    rice_condition = data.get("rice_condition", "to store")
    rice_condition_other = data.get("rice_condition_other", "")
    
    # Planting - UPDATED: Now have separate counts for 25kg and 50kg
    grains_to_plant_sacks_25kg = data.get("grains_to_plant_sacks_25kg", 0)
    grains_to_plant_sacks_50kg = data.get("grains_to_plant_sacks_50kg", 0)
    
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
                grains_to_plant_sacks_25kg, grains_to_plant_sacks_50kg,
                remarks, type, user_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING item_id, created_at;
        """, (
            name, price_per_unit,
            sacks_of_grains_25kg, sacks_of_grains_50kg,
            sacks_of_rice_25kg, sacks_of_rice_50kg,
            grains_condition, grains_condition_other,
            rice_condition, rice_condition_other,
            grains_to_plant_sacks_25kg, grains_to_plant_sacks_50kg,
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
    
    # Create notification for rice variant added
    try:
        notif_conn = get_connection()
        if notif_conn:
            notif_cursor = notif_conn.cursor()
            notif_cursor.execute("""
                INSERT INTO notifications (user_id, type, title, message, related_id, is_read)
                VALUES (%s, %s, %s, %s, %s, FALSE)
            """, (user_id, 'rice_variant_added', f'{name} Added to Inventory', f'New rice variety "{name}" has been added to your inventory.', item_id))
            notif_conn.commit()
            notif_cursor.close()
            notif_conn.close()
    except Exception as e:
        print(f"Error creating rice variant notification: {e}")
    
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
            
            # Planting - UPDATED: Separate counts for 25kg and 50kg
            "grains_to_plant_sacks_25kg": grains_to_plant_sacks_25kg,
            "grains_to_plant_sacks_50kg": grains_to_plant_sacks_50kg,
            
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
        except Exception as e:
            print(f"Token decode error: {e}")
            user_id = None
    
    # If no token, check for user_id in query params
    if not user_id:
        user_id = request.args.get("user_id")
    
    if not user_id:
        return jsonify({"message": "user_id is required (from token or query param)"}), 400
    
    # Ensure user_id is an integer
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return jsonify({"message": "user_id must be an integer"}), 400
    
    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                item_id, name, price_per_unit, 
                sacks_of_grains_25kg, sacks_of_grains_50kg,
                sacks_of_rice_25kg, sacks_of_rice_50kg,
                grains_condition, grains_condition_other,
                rice_condition, rice_condition_other,
                grains_to_plant_sacks_25kg, grains_to_plant_sacks_50kg,
                harvest_to_be_alloted,
                remarks, type, user_id, created_at 
            FROM inventory 
            WHERE user_id=%s 
            ORDER BY created_at DESC;
        """, (user_id,))
        
        rows = cursor.fetchall()
        inventory_items = []
        
        for row in rows:
            (item_id, name, price_per_unit, 
             sacks_of_grains_25kg, sacks_of_grains_50kg,
             sacks_of_rice_25kg, sacks_of_rice_50kg,
             grains_condition, grains_condition_other,
             rice_condition, rice_condition_other,
             grains_to_plant_sacks_25kg, grains_to_plant_sacks_50kg,
             harvest_to_be_alloted,
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
            rice_display_condition = rice_condition
            
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
                
                # Planting - UPDATED: Separate counts for 25kg and 50kg
                "grains_to_plant_sacks_25kg": grains_to_plant_sacks_25kg,
                "grains_to_plant_sacks_50kg": grains_to_plant_sacks_50kg,
                
                # Harvest to be alloted
                "harvest_to_be_alloted": harvest_to_be_alloted or 0,
                
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


@bp.route("/inventory/crops", methods=["GET"])
def list_inventory_crops():
    """Return distinct crop names in inventory for a given user (token or user_id query)."""
    # Determine user_id from token or query param
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
        user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT name, user_id
            FROM inventory
            WHERE user_id = %s
            ORDER BY name ASC;
        """, (user_id,))
        rows = cursor.fetchall()
        crops = [{"name": r[0], "user_id": r[1]} for r in rows if r and r[0]]
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching inventory crops", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"crops": crops}), 200


@bp.route("/inventory/total-grain", methods=["GET"])
def get_total_grain():
    """Return total grain available for planting (grains_to_plant_sacks converted to kg)."""
    # Determine user_id from token or query param
    auth = request.headers.get("Authorization")
    user_id = None

    if auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except Exception as e:
            print(f"Token decode error in get_total_grain: {e}")
            user_id = None

    if not user_id:
        user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    # Ensure user_id is an integer
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return jsonify({"message": "user_id must be an integer"}), 400

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                COALESCE(SUM(grains_to_plant_sacks_25kg), 0) * 25 + 
                COALESCE(SUM(grains_to_plant_sacks_50kg), 0) * 50 as total_grain_kg
            FROM inventory
            WHERE user_id = %s;
        """, (user_id,))
        row = cursor.fetchone()
        total_grain_kg = row[0] if row and row[0] else 0
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error calculating total grain", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"total_grain_kg": float(total_grain_kg)}), 200


@bp.route("/inventory/deduct-grain", methods=["POST"])
def deduct_grain():
    """Deduct grain from inventory when a crop is planted."""
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
    crop_name = data.get("crop_name", "").strip()
    quantity_kg = data.get("quantity_kg", 0)
    sacks_50kg_to_deduct = data.get("sacks_50kg", 0)
    sacks_25kg_to_deduct = data.get("sacks_25kg", 0)

    if not crop_name or quantity_kg <= 0:
        return jsonify({"message": "crop_name and quantity_kg are required"}), 400

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        # Find inventory item with this crop name for the user
        # Use grains_to_plant_sacks if > 0, otherwise use sacks_of_grains
        cursor.execute("""
            SELECT item_id, 
                   CASE WHEN grains_to_plant_sacks_25kg > 0 THEN grains_to_plant_sacks_25kg ELSE COALESCE(sacks_of_grains_25kg, 0) END as sacks_25kg,
                   CASE WHEN grains_to_plant_sacks_50kg > 0 THEN grains_to_plant_sacks_50kg ELSE COALESCE(sacks_of_grains_50kg, 0) END as sacks_50kg
            FROM inventory 
            WHERE user_id = %s AND name = %s 
            LIMIT 1;
        """, (user_id, crop_name))
        row = cursor.fetchone()

        if not row:
            return jsonify({"message": f"No inventory item found for crop: {crop_name}"}), 404

        item_id, sacks_25kg, sacks_50kg = row
        sacks_25kg = sacks_25kg or 0
        sacks_50kg = sacks_50kg or 0

        # Calculate current total grain in kg
        current_total_kg = (sacks_25kg * 25) + (sacks_50kg * 50)

        if quantity_kg > current_total_kg:
            return jsonify({
                "message": f"Insufficient grain. Required: {quantity_kg} kg, Available: {current_total_kg} kg"
            }), 400

        # If specific sack counts are provided, use them directly
        if sacks_50kg_to_deduct > 0 or sacks_25kg_to_deduct > 0:
            # Validate that enough sacks are available
            if sacks_50kg_to_deduct > sacks_50kg:
                return jsonify({
                    "message": f"Insufficient 50kg sacks. Required: {sacks_50kg_to_deduct}, Available: {sacks_50kg}"
                }), 400
            if sacks_25kg_to_deduct > sacks_25kg:
                return jsonify({
                    "message": f"Insufficient 25kg sacks. Required: {sacks_25kg_to_deduct}, Available: {sacks_25kg}"
                }), 400
            
            # Deduct the exact sacks specified
            new_sacks_50kg = sacks_50kg - sacks_50kg_to_deduct
            new_sacks_25kg = sacks_25kg - sacks_25kg_to_deduct
        else:
            # Legacy behavior: Deduct from 50kg sacks first, then 25kg sacks
            remaining_to_deduct = quantity_kg
            new_sacks_50kg = sacks_50kg
            new_sacks_25kg = sacks_25kg

            # Deduct from 50kg sacks
            sacks_to_remove_50kg = int(remaining_to_deduct // 50)
            if sacks_to_remove_50kg > 0:
                if sacks_to_remove_50kg <= new_sacks_50kg:
                    new_sacks_50kg -= sacks_to_remove_50kg
                    remaining_to_deduct -= sacks_to_remove_50kg * 50
                else:
                    remaining_to_deduct -= new_sacks_50kg * 50
                    new_sacks_50kg = 0

            # Deduct from 25kg sacks
            if remaining_to_deduct > 0:
                sacks_to_remove_25kg = int(remaining_to_deduct // 25)
                if sacks_to_remove_25kg > 0:
                    if sacks_to_remove_25kg <= new_sacks_25kg:
                        new_sacks_25kg -= sacks_to_remove_25kg
                        remaining_to_deduct -= sacks_to_remove_25kg * 25
                    else:
                        remaining_to_deduct -= new_sacks_25kg * 25
                        new_sacks_25kg = 0

        # Update both grains_to_plant_sacks and sacks_of_grains to keep them in sync
        cursor.execute("""
            UPDATE inventory 
            SET grains_to_plant_sacks_25kg = %s, 
                grains_to_plant_sacks_50kg = %s,
                sacks_of_grains_25kg = %s,
                sacks_of_grains_50kg = %s
            WHERE item_id = %s;
        """, (new_sacks_25kg, new_sacks_50kg, new_sacks_25kg, new_sacks_50kg, item_id))

        conn.commit()
        cursor.close()
        conn.close()

        print(f"✅ Deducted {quantity_kg} kg from {crop_name}: {new_sacks_50kg} x 50kg + {new_sacks_25kg} x 25kg remaining")
        
        return jsonify({
            "message": "Grain deducted successfully",
            "deducted_kg": quantity_kg,
            "remaining_25kg_sacks": new_sacks_25kg,
            "remaining_50kg_sacks": new_sacks_50kg,
        }), 200

    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f"❌ Error deducting grain: {e}")
        return jsonify({"message": "Error deducting grain", "error": str(e)}), 500
        cursor.close()
        conn.close()
        return jsonify({"message": "Error deducting grain", "error": str(e)}), 500


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
        
        # Planting - UPDATED: Now have separate counts for 25kg and 50kg
        if "grains_to_plant_sacks_25kg" in data:
            updates.append("grains_to_plant_sacks_25kg = %s")
            values.append(data["grains_to_plant_sacks_25kg"])
        
        if "grains_to_plant_sacks_50kg" in data:
            updates.append("grains_to_plant_sacks_50kg = %s")
            values.append(data["grains_to_plant_sacks_50kg"])
        
        # Handle harvest_to_be_alloted deduction when adding rice sacks
        if "sacks_of_rice_25kg" in data or "sacks_of_rice_50kg" in data:
            # Get current values to calculate the difference
            cursor.execute(
                "SELECT sacks_of_rice_25kg, sacks_of_rice_50kg, harvest_to_be_alloted FROM inventory WHERE item_id = %s",
                (item_id,)
            )
            current_row = cursor.fetchone()
            if current_row:
                current_rice_25kg, current_rice_50kg, current_alloted = current_row
                new_rice_25kg = data.get("sacks_of_rice_25kg", current_rice_25kg)
                new_rice_50kg = data.get("sacks_of_rice_50kg", current_rice_50kg)
                
                # Calculate kg added
                added_25kg = (new_rice_25kg - current_rice_25kg) * 25
                added_50kg = (new_rice_50kg - current_rice_50kg) * 50
                total_added_kg = added_25kg + added_50kg
                
                # Deduct from harvest_to_be_alloted
                if total_added_kg > 0:
                    new_alloted = max(0, (current_alloted or 0) - total_added_kg)
                    updates.append("harvest_to_be_alloted = %s")
                    values.append(new_alloted)
        
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
                # Parse the returned row - handle variable column count
                columns = [desc[0] for desc in cursor.description]
                row_dict = dict(zip(columns, updated_row))
                
                # Extract values from dictionary
                item_id = row_dict.get('item_id')
                name = row_dict.get('name')
                price_per_unit = row_dict.get('price_per_unit')
                sacks_of_grains_25kg = row_dict.get('sacks_of_grains_25kg', 0)
                sacks_of_grains_50kg = row_dict.get('sacks_of_grains_50kg', 0)
                sacks_of_rice_25kg = row_dict.get('sacks_of_rice_25kg', 0)
                sacks_of_rice_50kg = row_dict.get('sacks_of_rice_50kg', 0)
                grains_condition = row_dict.get('grains_condition')
                grains_condition_other = row_dict.get('grains_condition_other')
                rice_condition = row_dict.get('rice_condition')
                rice_condition_other = row_dict.get('rice_condition_other')
                grains_to_plant_sacks_25kg = row_dict.get('grains_to_plant_sacks_25kg', 0)
                grains_to_plant_sacks_50kg = row_dict.get('grains_to_plant_sacks_50kg', 0)
                harvest_to_be_alloted = row_dict.get('harvest_to_be_alloted', 0)
                remarks = row_dict.get('remarks')
                type_val = row_dict.get('type')
                uid = row_dict.get('user_id')
                created_at = row_dict.get('created_at')
                
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
                        
                        # Planting - UPDATED: Separate counts for 25kg and 50kg
                        "grains_to_plant_sacks_25kg": grains_to_plant_sacks_25kg,
                        "grains_to_plant_sacks_50kg": grains_to_plant_sacks_50kg,
                        
                        # Harvest to be alloted
                        "harvest_to_be_alloted": harvest_to_be_alloted or 0,
                        
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
    name = data.get("name")
    location = data.get("location")
    area_ha = data.get("area_ha")
    status = (data.get("status") or "available").lower()

    if not location:
        return jsonify({"message": "Field location is required"}), 400

    if status not in ("available", "occupied"):
        status = "available"

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

    # Extract lat/lon from location string and reverse geocode
    city = None
    state = None
    try:
        if location and isinstance(location, str) and "," in location:
            lat_str, lon_str = location.split(",", 1)
            lat_f = float(lat_str.strip())
            lon_f = float(lon_str.strip())
            
            # Reverse geocode to get city and state
            loc = _geolocator.reverse((lat_f, lon_f), exactly_one=True, language='en', timeout=10)
            if loc:
                raw = getattr(loc, 'raw', {}) or {}
                address = raw.get('address', {}) if isinstance(raw, dict) else {}
                city = (address.get('city') or address.get('town') or address.get('village') or
                        address.get('hamlet') or address.get('county') or None)
                state = address.get('state') or address.get('region') or None
    except Exception as e:
        # Log geocoding error but don't fail field creation
        print(f"Reverse geocoding failed for {location}: {str(e)}")
        city = None
        state = None

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO fields (name, location, user_id, area_ha, status, city, state)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING field_id;
        """, (name, location, user_id, area_ha, status, city, state))
        row = cursor.fetchone()
        conn.commit()
        field_id = row[0] if row else None
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error creating field", "error": str(e)}), 500
    response_name = name if name else (f"Field {field_id}" if field_id is not None else None)

    cursor.close()
    conn.close()
    return jsonify({"field": {"id": field_id, "name": response_name, "location": location, "user_id": user_id, "area_ha": area_ha, "status": status, "city": city, "state": state}}), 201


@bp.route("/fields", methods=["GET"]) 
def list_fields():
    # Optional query params: user_id
    q_user = request.args.get("user_id")
    q_id = request.args.get("id")

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        # Use LEFT JOIN to get the first crop name for each field in one query
        base_query = """
            SELECT f.field_id, f.name, f.location, f.user_id, f.area_ha, f.status, f.city, f.state, c.name
            FROM fields f
            LEFT JOIN (
                SELECT DISTINCT ON (field_id) field_id, name 
                FROM crops 
                ORDER BY field_id, crop_id
            ) c ON f.field_id = c.field_id
        """

        filters = []
        params = []
        if q_user:
            filters.append("f.user_id=%s")
            params.append(q_user)
        if q_id:
            filters.append("f.field_id=%s")
            params.append(q_id)

        if filters:
            base_query += " WHERE " + " AND ".join(filters)

        base_query += " ORDER BY f.field_id;"

        cursor.execute(base_query, tuple(params))
        rows = cursor.fetchall()
        fields = []
        for row in rows:
            fid, fname, location, uid, area_ha, status, city, state, crop_name = row
            display_name = fname or (crop_name + f" Field {fid}" if crop_name else f"Field {fid}")
            fields.append({
                "id": fid, 
                "name": display_name,
                "location": location, 
                "user_id": uid,
                "area_ha": area_ha,
                "status": status,
                "city": city,
                "state": state,
                "crop_name": crop_name
            })
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching fields", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"fields": fields}), 200


@bp.route("/fields/<int:field_id>", methods=["PATCH", "PUT"])
def update_field(field_id: int):
    data = request.get_json() or {}
    name = data.get("name")
    location = data.get("location")
    area_ha = data.get("area_ha")
    status = data.get("status")

    if status is not None:
        status = status.lower()
        if status not in ("available", "occupied"):
            return jsonify({"message": "Invalid status value"}), 400

    if name is None and location is None and area_ha is None and status is None:
        return jsonify({"message": "No fields to update"}), 400

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        updates = []
        params = []
        if name is not None:
            updates.append("name=%s")
            params.append(name)
        if location is not None:
            updates.append("location=%s")
            params.append(location)
        if area_ha is not None:
            updates.append("area_ha=%s")
            params.append(area_ha)
        if status is not None:
            updates.append("status=%s")
            params.append(status)

        params.append(field_id)

        cursor.execute(
            f"UPDATE fields SET {', '.join(updates)} WHERE field_id=%s RETURNING field_id, name, location, user_id, area_ha, status;",
            tuple(params)
        )
        row = cursor.fetchone()
        if not row:
            conn.rollback()
            cursor.close()
            conn.close()
            return jsonify({"message": "Field not found"}), 404

        conn.commit()
        fid, fname, loc, uid, area_val, status_val = row
        response_name = fname or f"Field {fid}"
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error updating field", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"field": {"id": fid, "name": response_name, "location": loc, "user_id": uid, "area_ha": area_val, "status": status_val}}), 200


# -------------------------
# Crops endpoints
# -------------------------
@bp.route("/crops", methods=["POST"]) 
def create_crop():
    data = request.get_json() or {}
    name = data.get("name")
    planting_date = data.get("planting_date")  # expect YYYY-MM-DD or None
    expected_harvest_date = data.get("expected_harvest_date")  # expect YYYY-MM-DD or None
    actual_harvest_date = data.get("actual_harvest_date")  # expect YYYY-MM-DD or None
    expected_yield_kg = data.get("expected_yield_kg")
    actual_yield_kg = data.get("actual_yield_kg")
    planted_grain_kg = data.get("planted_grain_kg")
    health_status = data.get("health_status")
    notes = data.get("notes")
    field_id = data.get("field_id")

    if not name:
        return jsonify({"message": "Crop name is required"}), 400

    # Derive health status and notes from planting date when provided
    derived_status, derived_note = compute_crop_health(planting_date)
    if derived_status:
        health_status = derived_status
    if derived_note:
        notes = derived_note if not notes else f"{derived_note} | {notes}"

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
            """
            INSERT INTO crops (name, health_status, planting_date, expected_harvest_date, actual_harvest_date, expected_yield_kg, actual_yield_kg, planted_grain_kg, notes, user_id, field_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING crop_id;
            """,
            (name, health_status, planting_date, expected_harvest_date, actual_harvest_date, expected_yield_kg, actual_yield_kg, planted_grain_kg, notes, user_id, field_id),
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
    return jsonify({"crop": {
        "id": crop_id,
        "name": name,
        "health_status": health_status,
        "planting_date": planting_date,
        "expected_harvest_date": expected_harvest_date,
        "actual_harvest_date": actual_harvest_date,
        "expected_yield_kg": expected_yield_kg,
        "actual_yield_kg": actual_yield_kg,
        "planted_grain_kg": planted_grain_kg,
        "notes": notes,
        "user_id": user_id,
        "field_id": field_id
    }}), 201


@bp.route("/crops", methods=["GET"]) 
def list_crops():
    q_user = request.args.get("user_id")
    q_field = request.args.get("field_id")

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        select_stmt = "SELECT crop_id, name, health_status, planting_date, expected_harvest_date, actual_harvest_date, expected_yield_kg, actual_yield_kg, planted_grain_kg, notes, user_id, field_id FROM crops"
        if q_user and q_field:
            cursor.execute(select_stmt + " WHERE user_id=%s AND field_id=%s;", (q_user, q_field))
        elif q_user:
            cursor.execute(select_stmt + " WHERE user_id=%s;", (q_user,))
        elif q_field:
            cursor.execute(select_stmt + " WHERE field_id=%s;", (q_field,))
        else:
            cursor.execute(select_stmt + ";")

        rows = cursor.fetchall()
        crops = []
        for row in rows:
            (
                cid,
                name,
                health_status,
                planting_date,
                expected_harvest_date,
                actual_harvest_date,
                expected_yield_kg,
                actual_yield_kg,
                planted_grain_kg,
                notes,
                uid,
                fid,
            ) = row

            # Refresh health/notes from planting date if available to keep responses aligned with age rule
            derived_status, derived_note = compute_crop_health(planting_date.isoformat() if planting_date else None)
            if derived_status:
                health_status = derived_status
            if derived_note:
                notes = derived_note if not notes else f"{derived_note} | {notes}"

            crops.append({
                "id": cid,
                "name": name,
                "health_status": health_status,
                "planting_date": planting_date.isoformat() if planting_date else None,
                "expected_harvest_date": expected_harvest_date.isoformat() if expected_harvest_date else None,
                "actual_harvest_date": actual_harvest_date.isoformat() if actual_harvest_date else None,
                "expected_yield_kg": expected_yield_kg,
                "actual_yield_kg": actual_yield_kg,
                "planted_grain_kg": planted_grain_kg,
                "notes": notes,
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


@bp.route("/crops/<int:crop_id>", methods=["PATCH"])
def update_crop(crop_id):
    data = request.get_json() or {}
    planting_date = data.get("planting_date")  # expect YYYY-MM-DD or None
    expected_harvest_date = data.get("expected_harvest_date")  # expect YYYY-MM-DD or None
    actual_harvest_date = data.get("actual_harvest_date")  # expect YYYY-MM-DD or None
    expected_yield_kg = data.get("expected_yield_kg")
    actual_yield_kg = data.get("actual_yield_kg")
    planted_grain_kg = data.get("planted_grain_kg")
    name = data.get("name")
    health_status = data.get("health_status")
    notes = data.get("notes")

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        # Build dynamic UPDATE statement
        updates = []
        values = []
        if planting_date is not None:
            updates.append("planting_date = %s")
            values.append(planting_date)
        if expected_harvest_date is not None:
            updates.append("expected_harvest_date = %s")
            values.append(expected_harvest_date)
        if actual_harvest_date is not None:
            updates.append("actual_harvest_date = %s")
            values.append(actual_harvest_date)
        if expected_yield_kg is not None:
            updates.append("expected_yield_kg = %s")
            values.append(expected_yield_kg)
        if actual_yield_kg is not None:
            updates.append("actual_yield_kg = %s")
            values.append(actual_yield_kg)
        if planted_grain_kg is not None:
            updates.append("planted_grain_kg = %s")
            values.append(planted_grain_kg)
        if name is not None:
            updates.append("name = %s")
            values.append(name)
        if health_status is not None:
            updates.append("health_status = %s")
            values.append(health_status)
        if notes is not None:
            updates.append("notes = %s")
            values.append(notes)

        if not updates:
            return jsonify({"message": "No fields to update"}), 400

        values.append(crop_id)
        # If planting_date is being changed, recompute health status/notes to enforce the rule
        if planting_date is not None:
            derived_status, derived_note = compute_crop_health(planting_date)
            health_status = derived_status
            if derived_note:
                notes = derived_note if not notes else f"{derived_note} | {notes}"
            # ensure these recomputed fields are saved even if not provided explicitly
            updates.append("health_status = %s")
            values.append(health_status)
            updates.append("notes = %s")
            values.append(notes)

        update_stmt = (
            f"UPDATE crops SET {', '.join(updates)} WHERE crop_id = %s "
            "RETURNING crop_id, name, health_status, planting_date, expected_harvest_date, actual_harvest_date, expected_yield_kg, actual_yield_kg, planted_grain_kg, notes, user_id, field_id;"
        )
        
        cursor.execute(update_stmt, values)
        row = cursor.fetchone()
        conn.commit()

        if not row:
            cursor.close()
            conn.close()
            return jsonify({"message": "Crop not found"}), 404

        (
            cid,
            name,
            health_status,
            planting_date,
            expected_harvest_date,
            actual_harvest_date,
            expected_yield_kg,
            actual_yield_kg,
            planted_grain_kg,
            notes,
            uid,
            fid,
        ) = row
        cursor.close()
        conn.close()
        return jsonify({"crop": {
            "id": cid,
            "name": name,
            "health_status": health_status,
            "planting_date": planting_date.isoformat() if planting_date else None,
            "expected_harvest_date": expected_harvest_date.isoformat() if expected_harvest_date else None,
            "actual_harvest_date": actual_harvest_date.isoformat() if actual_harvest_date else None,
            "expected_yield_kg": expected_yield_kg,
            "actual_yield_kg": actual_yield_kg,
            "planted_grain_kg": planted_grain_kg,
            "notes": notes,
            "user_id": uid,
            "field_id": fid,
        }}), 200
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error updating crop", "error": str(e)}), 500


# -------------------------
# Harvest crop (record history and free field)
# -------------------------
@bp.route("/crops/<int:crop_id>/harvest", methods=["POST"])
def harvest_crop(crop_id: int):
    data = request.get_json() or {}
    actual_harvest_date = data.get("actual_harvest_date")
    actual_yield_kg = data.get("actual_yield_kg")
    notes = data.get("notes")
    calendar_events = data.get("calendar_events")

    # Require auth token
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return jsonify({"message": "Authorization token missing"}), 401

    token = auth.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
    except Exception:
        return jsonify({"message": "Invalid or expired token"}), 401

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT crop_id, name, planting_date, expected_harvest_date, actual_harvest_date,
                   expected_yield_kg, actual_yield_kg, notes, user_id, field_id
            FROM crops
            WHERE crop_id = %s;
            """,
            (crop_id,),
        )
        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            return jsonify({"message": "Crop not found"}), 404

        (
            cid,
            crop_name,
            planting_date,
            expected_harvest_date,
            existing_actual_date,
            expected_yield,
            existing_actual_yield,
            existing_notes,
            crop_user_id,
            field_id,
        ) = row

        if crop_user_id and user_id and crop_user_id != user_id:
            cursor.close()
            conn.close()
            return jsonify({"message": "Not authorized to harvest this crop"}), 403

        final_actual_date = actual_harvest_date or (existing_actual_date.isoformat() if existing_actual_date else date.today().isoformat())
        final_actual_yield = actual_yield_kg if actual_yield_kg is not None else existing_actual_yield
        final_notes = notes if notes is not None else existing_notes

        cursor.execute(
            """
            INSERT INTO crop_harvest_history (
                crop_id, field_id, user_id, crop_name, planting_date, expected_harvest_date,
                actual_harvest_date, expected_yield_kg, actual_yield_kg, notes, calendar_events
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING harvest_id, created_at;
            """,
            (
                cid,
                field_id,
                user_id,
                crop_name,
                planting_date,
                expected_harvest_date,
                final_actual_date,
                expected_yield,
                final_actual_yield,
                final_notes,
                json.dumps(calendar_events) if calendar_events is not None else None,
            ),
        )
        hist_row = cursor.fetchone()

        # Delete the crop record after saving harvest history
        cursor.execute(
            """
            DELETE FROM crops
            WHERE crop_id = %s
            RETURNING crop_id;
            """,
            (cid,),
        )
        cursor.fetchone()

        # Update field status to available
        if field_id:
            cursor.execute("UPDATE fields SET status = 'available' WHERE field_id = %s;", (field_id,))

        # Update inventory: add actual_yield_kg to harvest_to_be_alloted for this crop
        if final_actual_yield and final_actual_yield > 0:
            # Find or create inventory item for this crop
            cursor.execute(
                """
                SELECT item_id, harvest_to_be_alloted
                FROM inventory
                WHERE name = %s AND user_id = %s
                LIMIT 1;
                """,
                (crop_name, user_id),
            )
            inv_row = cursor.fetchone()
            
            if inv_row:
                # Update existing inventory item
                item_id, current_alloted = inv_row
                new_alloted = (current_alloted or 0) + final_actual_yield
                cursor.execute(
                    "UPDATE inventory SET harvest_to_be_alloted = %s WHERE item_id = %s;",
                    (new_alloted, item_id),
                )
            else:
                # Create new inventory item with the harvest
                cursor.execute(
                    """
                    INSERT INTO inventory (name, user_id, harvest_to_be_alloted, type)
                    VALUES (%s, %s, %s, 'rice_variety')
                    RETURNING item_id;
                    """,
                    (crop_name, user_id, final_actual_yield),
                )

        conn.commit()

        harvest = {
            "harvest_id": hist_row[0] if hist_row else None,
            "crop_id": cid,
            "field_id": field_id,
            "user_id": user_id,
            "crop_name": crop_name,
            "planting_date": planting_date.isoformat() if planting_date else None,
            "expected_harvest_date": expected_harvest_date.isoformat() if expected_harvest_date else None,
            "actual_harvest_date": final_actual_date,
            "expected_yield_kg": expected_yield,
            "actual_yield_kg": final_actual_yield,
            "notes": final_notes,
            "calendar_events": calendar_events,
            "created_at": hist_row[1].isoformat() if hist_row and hist_row[1] else None,
        }

        cursor.close()
        conn.close()
        return jsonify({"message": "Harvest recorded", "harvest": harvest}), 200
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error recording harvest", "error": str(e)}), 500


# -------------------------
# Get crop harvest history
# -------------------------
@bp.route("/harvest-history", methods=["GET"])
def get_harvest_history():
    """Fetch crop harvest history for authenticated user, with optional filtering."""
    # Get user from token
    auth = request.headers.get("Authorization")
    user_id = None

    if auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except Exception:
            pass

    # Fallback to user_id query param
    if not user_id:
        user_id = request.args.get("user_id")
        if user_id:
            try:
                user_id = int(user_id)
            except Exception:
                user_id = None

    if not user_id:
        return jsonify({"message": "user_id required"}), 400

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute(
            """
                 SELECT harvest_id, crop_id, field_id, user_id, crop_name, planting_date,
                     expected_harvest_date, actual_harvest_date, expected_yield_kg,
                     actual_yield_kg, notes, calendar_events, created_at
            FROM crop_harvest_history
            WHERE user_id = %s
            ORDER BY created_at DESC;
            """,
            (user_id,),
        )

        rows = cursor.fetchall()
        harvest_records = []
        for row in rows:
            (
                hid,
                cid,
                fid,
                uid,
                crop_name,
                planting_date,
                expected_harvest_date,
                actual_harvest_date,
                expected_yield,
                actual_yield,
                notes,
                calendar_events,
                created_at,
            ) = row

            events_payload = None
            try:
                # psycopg returns dict for jsonb; fall back to decode string payloads
                if isinstance(calendar_events, str):
                    events_payload = json.loads(calendar_events)
                else:
                    events_payload = calendar_events
            except Exception:
                events_payload = None

            harvest_records.append({
                "harvest_id": hid,
                "crop_id": cid,
                "field_id": fid,
                "user_id": uid,
                "crop_name": crop_name,
                "planting_date": planting_date.isoformat() if planting_date else None,
                "expected_harvest_date": expected_harvest_date.isoformat() if expected_harvest_date else None,
                "actual_harvest_date": actual_harvest_date.isoformat() if actual_harvest_date else None,
                "expected_yield_kg": expected_yield,
                "actual_yield_kg": actual_yield,
                "notes": notes,
                "calendar_events": events_payload,
                "created_at": created_at.isoformat() if created_at else None,
            })

        cursor.close()
        conn.close()
        return jsonify({"harvest_history": harvest_records}), 200
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching harvest history", "error": str(e)}), 500


# -------------------------
# Get crop harvest history for a field
# -------------------------
@bp.route("/fields/<int:field_id>/harvest-history", methods=["GET"])
def get_field_harvest_history(field_id: int):
    """Fetch crop harvest history rows filtered by field_id.

    Returns items using the keys expected by the frontend history page.
    """
    # Optional: scope by authenticated user to avoid leaking other users' data
    auth = request.headers.get("Authorization")
    user_id = None
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except Exception:
            user_id = None

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        params = [field_id]
        where_clause = "field_id = %s"
        if user_id:
            where_clause += " AND (user_id = %s OR user_id IS NULL)"
            params.append(user_id)

        cursor.execute(
            f"""
                 SELECT harvest_id, crop_id, field_id, user_id, crop_name, planting_date,
                     expected_harvest_date, actual_harvest_date, expected_yield_kg,
                     actual_yield_kg, notes, calendar_events, created_at
            FROM crop_harvest_history
            WHERE {where_clause}
            ORDER BY created_at DESC;
            """,
            tuple(params),
        )

        rows = cursor.fetchall()
        history = []
        for row in rows:
            (
                hid,
                cid,
                fid,
                uid,
                crop_name,
                planting_date,
                expected_harvest_date,
                actual_harvest_date,
                expected_yield,
                actual_yield,
                notes,
                calendar_events,
                created_at,
            ) = row

            events_payload = None
            try:
                if isinstance(calendar_events, str):
                    events_payload = json.loads(calendar_events)
                else:
                    events_payload = calendar_events
            except Exception:
                events_payload = None

            history.append({
                "id": hid,
                "crop_id": cid,
                "field_id": fid,
                "user_id": uid,
                "crop_name": crop_name,
                "planting_date": planting_date.isoformat() if planting_date else None,
                "harvest_date": actual_harvest_date.isoformat() if actual_harvest_date else None,
                "expected_harvest_date": expected_harvest_date.isoformat() if expected_harvest_date else None,
                "expected_yield_kg": expected_yield if expected_yield is not None else 0,
                "actual_yield_kg": actual_yield if actual_yield is not None else 0,
                "notes": notes,
                "calendar_events": events_payload,
                "created_at": created_at.isoformat() if created_at else None,
            })

        cursor.close()
        conn.close()
        return jsonify({"history": history}), 200
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching field harvest history", "error": str(e)}), 500


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


# -------------------------
# Delivery endpoints
# -------------------------
@bp.route("/deliveries", methods=["POST"])
def create_delivery():
    """Create a new delivery record with line items."""
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
    delivery_date = data.get("delivery_date")
    delivery_time = data.get("delivery_time", "09:00:00")
    recipient = data.get("recipient")
    destination = data.get("destination")
    method = data.get("method", "delivery")
    status = data.get("status", "to be delivered")
    notes = data.get("notes", "")
    items = data.get("items", [])
    
    if not delivery_date or not recipient or not destination:
        return jsonify({"message": "delivery_date, recipient, and destination are required"}), 400
    
    if not items or len(items) == 0:
        return jsonify({"message": "At least one delivery item is required"}), 400
    
    # Validate all items
    total_qty = 0
    for item in items:
        if not item.get("variety") or item.get("sacks", 0) <= 0:
            return jsonify({"message": "Each item must have a variety and positive sacks"}), 400
        sack_size = item.get("sack_size_kg", 50)
        sacks = item.get("sacks", 0)
        total_qty += sack_size * sacks

    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500

    cursor = conn.cursor()
    try:
        # MODIFICATION 3: Check stock availability before creating delivery
        for item in items:
            variety = item.get("variety")
            sack_size = item.get("sack_size_kg", 50)
            sacks = item.get("sacks", 0)
            
            # Check if variety exists and has enough stock
            if sack_size == 25:
                cursor.execute("""
                    SELECT sacks_of_rice_25kg FROM inventory 
                    WHERE user_id = %s AND name = %s AND rice_condition = 'to sell'
                """, (user_id, variety))
            else:  # 50kg
                cursor.execute("""
                    SELECT sacks_of_rice_50kg FROM inventory 
                    WHERE user_id = %s AND name = %s AND rice_condition = 'to sell'
                """, (user_id, variety))
            
            stock_row = cursor.fetchone()
            if not stock_row:
                return jsonify({
                    "message": f"Variety '{variety}' not found or not marked for sale"
                }), 400
            
            available_stock = stock_row[0] or 0
            if sacks > available_stock:
                return jsonify({
                    "message": f"Insufficient stock for '{variety}'. Available: {available_stock} sacks of {sack_size}kg, Requested: {sacks}"
                }), 400
        
        # Calculate total revenue from inventory prices
        total_revenue = calculate_delivery_revenue(user_id, items, conn)
        
        # Insert delivery header with calculated revenue
        cursor.execute("""
            INSERT INTO delivery (user_id, delivery_date, delivery_time, recipient, destination, method, status, notes, total_quantity_kg, total_revenue_php)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING delivery_id;
        """, (user_id, delivery_date, delivery_time, recipient, destination, method, status, notes, total_qty, total_revenue))
        
        row = cursor.fetchone()
        delivery_id = row[0] if row else None
        
        if not delivery_id:
            conn.rollback()
            return jsonify({"message": "Failed to create delivery"}), 500
        
        # Insert delivery items
        for item in items:
            cursor.execute("""
                INSERT INTO delivery_item (delivery_id, variety, sack_size_kg, sacks)
                VALUES (%s, %s, %s, %s);
            """, (delivery_id, item.get("variety"), item.get("sack_size_kg"), item.get("sacks")))
        
        # MODIFICATION 3: Deduct inventory if status is "to be delivered" or "delivered"
        if status in ['to be delivered', 'delivered']:
            for item in items:
                variety = item.get("variety")
                sack_size = item.get("sack_size_kg", 50)
                sacks = item.get("sacks", 0)
                
                if sack_size == 25:
                    cursor.execute("""
                        UPDATE inventory 
                        SET sacks_of_rice_25kg = sacks_of_rice_25kg - %s
                        WHERE user_id = %s AND name = %s
                    """, (sacks, user_id, variety))
                else:  # 50kg
                    cursor.execute("""
                        UPDATE inventory 
                        SET sacks_of_rice_50kg = sacks_of_rice_50kg - %s
                        WHERE user_id = %s AND name = %s
                    """, (sacks, user_id, variety))
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error creating delivery", "error": str(e)}), 500

    cursor.close()
    conn.close()
    
    # Create notification for delivery placed
    try:
        notif_conn = get_connection()
        if notif_conn:
            notif_cursor = notif_conn.cursor()
            notif_title = 'Delivery Placed'
            notif_message = f'Delivery to {recipient} has been placed.'
            notif_cursor.execute("""
                INSERT INTO notifications (user_id, type, title, message, related_id, is_read)
                VALUES (%s, %s, %s, %s, %s, FALSE)
            """, (user_id, 'delivery_placed', notif_title, notif_message, delivery_id))
            notif_conn.commit()
            notif_cursor.close()
            notif_conn.close()
    except Exception as e:
        print(f"Error creating delivery notification: {e}")
    
    return jsonify({
        "message": "Delivery created successfully",
        "delivery_id": delivery_id
    }), 201


@bp.route("/deliveries", methods=["GET"])
def list_deliveries():
    """Get deliveries for the authenticated user."""
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
        # Fetch all deliveries and their items in a single JOIN query
        cursor.execute("""
            SELECT d.delivery_id, d.delivery_date, d.recipient, d.destination, 
                    d.delivery_time,
                   d.method, d.status, d.notes, d.total_quantity_kg, d.total_revenue_php, d.created_at,
                   di.variety, di.sack_size_kg, di.sacks
            FROM delivery d
            LEFT JOIN delivery_item di ON d.delivery_id = di.delivery_id
            WHERE d.user_id = %s
            ORDER BY d.delivery_date DESC, d.delivery_id;
        """, (user_id,))
        
        rows = cursor.fetchall()
        deliveries_dict = {}
        
        # Aggregate items per delivery
        for row in rows:
            delivery_id = row[0]
            delivery_date = row[1]
            recipient = row[2]
            destination = row[3]
            delivery_time = row[4]
            method = row[5]
            status = row[6]
            notes = row[7]
            total_qty = row[8]
            total_revenue = row[9]
            created_at = row[10]
            variety = row[11]
            sack_size_kg = row[12]
            sacks = row[13]
            
            if delivery_id not in deliveries_dict:
                try:
                    delivery_date_iso = delivery_date.isoformat() if hasattr(delivery_date, 'isoformat') else str(delivery_date)
                    delivery_time_str = delivery_time.isoformat() if hasattr(delivery_time, 'isoformat') else str(delivery_time)
                    created_at_iso = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)
                except Exception:
                    delivery_date_iso = str(delivery_date)
                    delivery_time_str = str(delivery_time)
                    created_at_iso = str(created_at)
                
                deliveries_dict[delivery_id] = {
                    "id": delivery_id,
                    "delivery_date": delivery_date_iso,
                    "delivery_time": delivery_time_str,
                    "recipient": recipient,
                    "destination": destination,
                    "method": method,
                    "status": status,
                    "notes": notes,
                    "total_quantity_kg": total_qty,
                    "total_revenue_php": total_revenue or 0,
                    "items": [],
                    "created_at": created_at_iso
                }
            
            # Add item if it exists
            if variety is not None:
                deliveries_dict[delivery_id]["items"].append({
                    "variety": variety,
                    "sack_size_kg": sack_size_kg,
                    "sacks": sacks
                })
        
        deliveries = list(deliveries_dict.values())
        
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching deliveries", "error": str(e)}), 500

    cursor.close()
    conn.close()
    
    return jsonify({"deliveries": deliveries}), 200


@bp.route("/deliveries/<int:delivery_id>", methods=["PUT"])
def update_delivery(delivery_id):
    """Update a delivery record."""
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
        # Check if delivery belongs to user and get current status and recipient
        cursor.execute("SELECT user_id, status, recipient FROM delivery WHERE delivery_id = %s", (delivery_id,))
        row = cursor.fetchone()
        
        if not row:
            cursor.close()
            conn.close()
            return jsonify({"message": "Delivery not found"}), 404
        
        if row[0] != user_id:
            cursor.close()
            conn.close()
            return jsonify({"message": "Unauthorized"}), 403
        
        old_status = row[1]
        recipient_name = row[2]
        new_status = data.get("status", old_status)
        status_changed = old_status != new_status if "status" in data else False
        
        # MODIFICATION 3: Handle inventory adjustments when status changes
        if status_changed:
            # Get delivery items
            cursor.execute("""
                SELECT variety, sack_size_kg, sacks 
                FROM delivery_item 
                WHERE delivery_id = %s
            """, (delivery_id,))
            delivery_items = cursor.fetchall()
            
            # If changing from to be delivered/delivered to returned/cancelled, return stock
            if old_status in ['to be delivered', 'delivered'] and new_status in ['returned', 'cancelled']:
                for item in delivery_items:
                    variety, sack_size_kg, sacks = item
                    if sack_size_kg == 25:
                        cursor.execute("""
                            UPDATE inventory 
                            SET sacks_of_rice_25kg = sacks_of_rice_25kg + %s
                            WHERE user_id = %s AND name = %s
                        """, (sacks, user_id, variety))
                    else:  # 50kg
                        cursor.execute("""
                            UPDATE inventory 
                            SET sacks_of_rice_50kg = sacks_of_rice_50kg + %s
                            WHERE user_id = %s AND name = %s
                        """, (sacks, user_id, variety))
            
            # If changing from returned/cancelled to to be delivered/delivered, deduct stock
            elif old_status in ['returned', 'cancelled'] and new_status in ['to be delivered', 'delivered']:
                # First check if enough stock is available
                for item in delivery_items:
                    variety, sack_size_kg, sacks = item
                    if sack_size_kg == 25:
                        cursor.execute("""
                            SELECT sacks_of_rice_25kg FROM inventory 
                            WHERE user_id = %s AND name = %s
                        """, (user_id, variety))
                    else:  # 50kg
                        cursor.execute("""
                            SELECT sacks_of_rice_50kg FROM inventory 
                            WHERE user_id = %s AND name = %s
                        """, (user_id, variety))
                    
                    stock_row = cursor.fetchone()
                    if not stock_row:
                        conn.rollback()
                        cursor.close()
                        conn.close()
                        return jsonify({
                            "message": f"Variety '{variety}' not found in inventory"
                        }), 400
                    
                    available_stock = stock_row[0] or 0
                    if sacks > available_stock:
                        conn.rollback()
                        cursor.close()
                        conn.close()
                        return jsonify({
                            "message": f"Insufficient stock for '{variety}'. Available: {available_stock} sacks of {sack_size_kg}kg, Requested: {sacks}"
                        }), 400
                
                # Deduct stock
                for item in delivery_items:
                    variety, sack_size_kg, sacks = item
                    if sack_size_kg == 25:
                        cursor.execute("""
                            UPDATE inventory 
                            SET sacks_of_rice_25kg = sacks_of_rice_25kg - %s
                            WHERE user_id = %s AND name = %s
                        """, (sacks, user_id, variety))
                    else:  # 50kg
                        cursor.execute("""
                            UPDATE inventory 
                            SET sacks_of_rice_50kg = sacks_of_rice_50kg - %s
                            WHERE user_id = %s AND name = %s
                        """, (sacks, user_id, variety))
        
        # Update delivery header fields
        updates = []
        values = []
        
        if "delivery_date" in data:
            updates.append("delivery_date = %s")
            values.append(data["delivery_date"])
        
        if "recipient" in data:
            updates.append("recipient = %s")
            values.append(data["recipient"])
        
        if "destination" in data:
            updates.append("destination = %s")
            values.append(data["destination"])
        
        if "method" in data:
            updates.append("method = %s")
            values.append(data["method"])
        
        if "status" in data:
            updates.append("status = %s")
            values.append(data["status"])
        
        if "notes" in data:
            updates.append("notes = %s")
            values.append(data["notes"])
        
        # Update items if provided
        if "items" in data:
            items = data["items"]
            
            # Recalculate total
            total_qty = 0
            for item in items:
                total_qty += item.get("sack_size_kg", 50) * item.get("sacks", 0)
            
            updates.append("total_quantity_kg = %s")
            values.append(total_qty)
            
            # Delete old items
            cursor.execute("DELETE FROM delivery_item WHERE delivery_id = %s", (delivery_id,))
            
            # Insert new items
            for item in items:
                cursor.execute("""
                    INSERT INTO delivery_item (delivery_id, variety, sack_size_kg, sacks)
                    VALUES (%s, %s, %s, %s);
                """, (delivery_id, item.get("variety"), item.get("sack_size_kg"), item.get("sacks")))
        
        # Execute update if there are any updates
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            values.append(delivery_id)
            
            query = f"UPDATE delivery SET {', '.join(updates)} WHERE delivery_id = %s;"
            cursor.execute(query, values)
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error updating delivery", "error": str(e)}), 500

    cursor.close()
    conn.close()
    
    # Create notification if status changed
    if status_changed:
        try:
            notif_conn = get_connection()
            if notif_conn:
                notif_cursor = notif_conn.cursor()
                
                # Determine notification type and message based on new status
                if new_status == 'delivered':
                    notif_type = 'delivery_confirmed'
                    notif_title = 'Delivery Completed'
                    notif_message = f'Delivery to {recipient_name} has been completed.'
                elif new_status == 'returned':
                    notif_type = 'delivery_returned'
                    notif_title = 'Delivery Returned'
                    notif_message = f'Delivery to {recipient_name} has been returned.'
                elif new_status == 'cancelled':
                    notif_type = 'delivery_cancelled'
                    notif_title = 'Delivery Cancelled'
                    notif_message = f'Delivery to {recipient_name} has been cancelled.'
                else:
                    notif_type = 'delivery_placed'
                    notif_title = 'Delivery Status Updated'
                    notif_message = f'Delivery status changed to {new_status}.'
                
                notif_cursor.execute("""
                    INSERT INTO notifications (user_id, type, title, message, related_id, is_read)
                    VALUES (%s, %s, %s, %s, %s, FALSE)
                """, (user_id, notif_type, notif_title, notif_message, delivery_id))
                notif_conn.commit()
                notif_cursor.close()
                notif_conn.close()
        except Exception as e:
            print(f"Error creating delivery status notification: {e}")
    
    return jsonify({"message": "Delivery updated successfully"}), 200


@bp.route("/deliveries/<int:delivery_id>", methods=["DELETE"])
def delete_delivery(delivery_id):
    """Delete a delivery record."""
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
        # Check if delivery belongs to user
        cursor.execute("SELECT user_id FROM delivery WHERE delivery_id = %s", (delivery_id,))
        row = cursor.fetchone()
        
        if not row:
            cursor.close()
            conn.close()
            return jsonify({"message": "Delivery not found"}), 404
        
        if row[0] != user_id:
            cursor.close()
            conn.close()
            return jsonify({"message": "Unauthorized"}), 403
        
        # Delete delivery (items will cascade delete)
        cursor.execute("DELETE FROM delivery WHERE delivery_id = %s", (delivery_id,))
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error deleting delivery", "error": str(e)}), 500

    cursor.close()
    conn.close()
    
    return jsonify({"message": "Delivery deleted successfully"}), 200

# -------------------------
# Security settings endpoints
# -------------------------
@bp.route("/security-settings", methods=["GET"])
def get_security_settings():
    """Get security settings for authenticated user."""
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
        cursor.execute("""
            SELECT two_factor_auth, session_timeout, save_login
            FROM security_settings 
            WHERE user_id=%s;
        """, (user_id,))
        row = cursor.fetchone()
        
        if row:
            security = {
                "twoFactorAuth": row[0],
                "sessionTimeout": str(row[1]),
                "saveLogin": row[2],
            }
        else:
            # Return defaults
            security = {
                "twoFactorAuth": False,
                "sessionTimeout": "30",
                "saveLogin": False,
            }
            
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching security settings", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"security": security}), 200


@bp.route("/security-settings", methods=["PUT"])
def update_security_settings():
    """Update security settings."""
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
        # Check if settings exist
        cursor.execute("SELECT 1 FROM security_settings WHERE user_id=%s;", (user_id,))
        exists = cursor.fetchone()
        
        session_timeout = int(data.get("sessionTimeout", 30))
        
        if exists:
            cursor.execute("""
                UPDATE security_settings 
                SET two_factor_auth=%s, session_timeout=%s, 
                    save_login=%s, updated_at=CURRENT_TIMESTAMP
                WHERE user_id=%s;
            """, (
                data.get("twoFactorAuth", False),
                session_timeout,
                data.get("saveLogin", False),
                user_id
            ))
        else:
            cursor.execute("""
                INSERT INTO security_settings 
                (user_id, two_factor_auth, session_timeout, save_login)
                VALUES (%s, %s, %s, %s);
            """, (
                user_id,
                data.get("twoFactorAuth", False),
                session_timeout,
                data.get("saveLogin", False)
            ))
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error updating security settings", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"message": "Security settings updated successfully"}), 200

# -------------------------
# PDF Download endpoint
# -------------------------
@bp.route("/api/download-user-guide", methods=["GET"])
def download_user_guide():
    """Serve the user guide PDF file."""
    try:
        import os
        from flask import send_file, current_app
        
        # Try different possible locations for the PDF
        possible_paths = [
            # If PDF is in the frontend app folder (relative to backend)
            os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'app', 'CropTech User Guide or Manual.pdf'),
            # If PDF is in the same directory as route.py
            os.path.join(os.path.dirname(__file__), 'CropTech User Guide or Manual.pdf'),
            # If PDF is in a docs folder
            os.path.join(os.path.dirname(__file__), 'docs', 'CropTech User Guide or Manual.pdf'),
            # If PDF is in a public folder
            os.path.join(os.path.dirname(__file__), 'public', 'CropTech User Guide or Manual.pdf'),
        ]
        
        pdf_path = None
        for path in possible_paths:
            if os.path.exists(path):
                pdf_path = path
                break
        
        if pdf_path and os.path.exists(pdf_path):
            return send_file(
                pdf_path,
                as_attachment=True,
                download_name='CropTech_User_Manual.pdf',
                mimetype='application/pdf'
            )
        else:
            # Create a simple PDF response as fallback
            from io import BytesIO
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            p.setFont("Helvetica", 12)
            p.drawString(100, 750, "CropTech User Guide")
            p.drawString(100, 730, "This is a placeholder PDF.")
            p.drawString(100, 710, "Please ensure 'CropTech User Guide or Manual.pdf'")
            p.drawString(100, 690, "is placed in the correct location.")
            p.showPage()
            p.save()
            
            buffer.seek(0)
            return send_file(
                buffer,
                as_attachment=True,
                download_name='CropTech_User_Manual.pdf',
                mimetype='application/pdf'
            )
            
    except Exception as e:
        return jsonify({"message": "Error serving PDF", "error": str(e)}), 500
    

# -------------------------
# Forgot Password - Request Reset
# -------------------------
@bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = data.get("email")
    
    if not email:
        return jsonify({"message": "Email is required"}), 400
    
    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500
    
    cursor = conn.cursor()
    
    try:
        # Check if user exists
        cursor.execute("SELECT user_id, name, email FROM users WHERE email=%s;", (email,))
        user = cursor.fetchone()
        
        if not user:
            # For security, don't reveal if user exists or not
            cursor.close()
            conn.close()
            # Still return success to prevent email enumeration
            return jsonify({"message": "email is not existing or incorrect. Please check."}), 200
        
        user_id, name, user_email = user
        
        # Generate reset token (use a simple token for local testing)
        import secrets
        import string
        token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        
        # Token expires in 1 hour
        from datetime import datetime, timedelta
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Store token in database
        cursor.execute("""
            INSERT INTO password_reset_tokens (user_id, email, token, expires_at, used)
            VALUES (%s, %s, %s, %s, FALSE)
            RETURNING token_id;
        """, (user_id, email, token, expires_at))
        
        conn.commit()
        
        # In a production environment, you would send an email here.
        # For local testing, we'll just return the reset link in the response.
        # NEVER do this in production!
        
        # Use localhost:3000 for Next.js frontend
        reset_link = f"http://localhost:3000/reset-password/{token}"
        
        print(f"=== LOCAL DEVELOPMENT MODE ===")
        print(f"Reset password for: {email}")
        print(f"Reset link: {reset_link}")
        print(f"Token: {token}")
        print(f"=============================")
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error processing request", "error": str(e)}), 500
    
    cursor.close()
    conn.close()
    
    return jsonify({
        "message": "We sent password reset instructions.",
        "dev_mode_link": reset_link  # Only include in development
    }), 200

# -------------------------
# Validate Reset Token
# -------------------------
@bp.route("/validate-reset-token/<token>", methods=["GET"])
def validate_reset_token(token):
    if not token:
        return jsonify({"valid": False, "message": "Token is required"}), 400
    
    conn = get_connection()
    if conn is None:
        return jsonify({"valid": False, "message": "Database connection not available"}), 500
    
    cursor = conn.cursor()
    
    try:
        # Check token validity
        cursor.execute("""
            SELECT token_id, user_id, email, expires_at, used 
            FROM password_reset_tokens 
            WHERE token=%s;
        """, (token,))
        
        token_data = cursor.fetchone()
        
        if not token_data:
            cursor.close()
            conn.close()
            return jsonify({"valid": False, "message": "Invalid or expired token"}), 400
        
        token_id, user_id, email, expires_at, used = token_data
        
        # Check if token is used
        if used:
            cursor.close()
            conn.close()
            return jsonify({"valid": False, "message": "Token has already been used"}), 400
        
        # Check if token is expired
        from datetime import datetime
        if expires_at < datetime.utcnow():
            cursor.close()
            conn.close()
            return jsonify({"valid": False, "message": "Token has expired"}), 400
        
        # Check if user still exists
        cursor.execute("SELECT user_id FROM users WHERE user_id=%s AND email=%s;", (user_id, email))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({"valid": False, "message": "User no longer exists"}), 400
        
        cursor.close()
        conn.close()
        return jsonify({
            "valid": True,
            "message": "Token is valid",
            "email": email
        }), 200
        
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"valid": False, "message": "Error validating token", "error": str(e)}), 500


# -------------------------
# Reset Password with Token
# -------------------------
@bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    token = data.get("token")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")
    
    if not token or not new_password or not confirm_password:
        return jsonify({"message": "Token, new password, and confirmation are required"}), 400
    
    if new_password != confirm_password:
        return jsonify({"message": "Passwords do not match"}), 400
    
    if len(new_password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400
    
    conn = get_connection()
    if conn is None:
        return jsonify({"message": "Database connection not available"}), 500
    
    cursor = conn.cursor()
    
    try:
        # Validate token first
        cursor.execute("""
            SELECT token_id, user_id, email, expires_at, used 
            FROM password_reset_tokens 
            WHERE token=%s;
        """, (token,))
        
        token_data = cursor.fetchone()
        
        if not token_data:
            cursor.close()
            conn.close()
            return jsonify({"message": "Invalid or expired token"}), 400
        
        token_id, user_id, email, expires_at, used = token_data
        
        # Check if token is used
        if used:
            cursor.close()
            conn.close()
            return jsonify({"message": "Token has already been used"}), 400
        
        # Check if token is expired
        from datetime import datetime
        if expires_at < datetime.utcnow():
            cursor.close()
            conn.close()
            return jsonify({"message": "Token has expired"}), 400
        
        # Update user password
        hashed_password = generate_password_hash(new_password)
        cursor.execute("""
            UPDATE users 
            SET password=%s 
            WHERE user_id=%s AND email=%s;
        """, (hashed_password, user_id, email))
        
        # Mark token as used
        cursor.execute("""
            UPDATE password_reset_tokens 
            SET used=TRUE 
            WHERE token_id=%s;
        """, (token_id,))
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error resetting password", "error": str(e)}), 500
    
    cursor.close()
    conn.close()
    
    return jsonify({"message": "Password has been reset successfully. You can now sign in."}), 200


# ============================================
# NOTIFICATION ENDPOINTS
# ============================================

@bp.route("/notifications", methods=["GET"])
def get_notifications():
    """
    Retrieve notifications for a user
    Query params: user_id (required), limit (optional, default 50), is_read (optional filter)
    """
    user_id = request.args.get("user_id")
    limit = request.args.get("limit", 50)
    is_read = request.args.get("is_read")
    
    if not user_id:
        return jsonify({"message": "user_id is required"}), 400
    
    try:
        limit = int(limit)
    except:
        limit = 50
    
    conn = get_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    
    try:
        # Build query based on filters
        query = """
            SELECT notification_id, user_id, type, title, message, related_id, is_read, created_at
            FROM notifications
            WHERE user_id = %s
        """
        params = [user_id]
        
        if is_read is not None:
            query += " AND is_read = %s"
            params.append(is_read.lower() == 'true')
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        notifications = []
        for row in rows:
            notifications.append({
                "notification_id": row[0],
                "user_id": row[1],
                "type": row[2],
                "title": row[3],
                "message": row[4],
                "related_id": row[5],
                "is_read": row[6],
                "created_at": row[7].isoformat() if row[7] else None
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({"notifications": notifications}), 200
        
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"message": "Error fetching notifications", "error": str(e)}), 500


@bp.route("/notifications", methods=["POST"])
def create_notification():
    """
    Create a new notification
    Body: user_id, type, title, message, related_id (optional)
    """
    data = request.get_json()
    
    user_id = data.get("user_id")
    notif_type = data.get("type")
    title = data.get("title")
    message = data.get("message")
    related_id = data.get("related_id")
    
    if not all([user_id, notif_type, title, message]):
        return jsonify({"message": "user_id, type, title, and message are required"}), 400
    
    # Validate notification type
    valid_types = ['harvest', 'planted', 'delivery_placed', 'delivery_confirmed', 
                   'delivery_returned', 'delivery_cancelled', 'field_added', 'rice_variant_added']
    if notif_type not in valid_types:
        return jsonify({"message": f"Invalid notification type. Must be one of: {', '.join(valid_types)}"}), 400
    
    conn = get_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO notifications (user_id, type, title, message, related_id, is_read)
            VALUES (%s, %s, %s, %s, %s, FALSE)
            RETURNING notification_id, user_id, type, title, message, related_id, is_read, created_at
        """, (user_id, notif_type, title, message, related_id))
        
        row = cursor.fetchone()
        conn.commit()
        
        notification = {
            "notification_id": row[0],
            "user_id": row[1],
            "type": row[2],
            "title": row[3],
            "message": row[4],
            "related_id": row[5],
            "is_read": row[6],
            "created_at": row[7].isoformat() if row[7] else None
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({"notification": notification}), 201
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error creating notification", "error": str(e)}), 500


@bp.route("/notifications/<int:notification_id>", methods=["PATCH"])
def update_notification(notification_id):
    """
    Update a notification (typically to mark as read)
    Body: is_read (boolean)
    """
    data = request.get_json()
    is_read = data.get("is_read")
    
    if is_read is None:
        return jsonify({"message": "is_read is required"}), 400
    
    conn = get_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE notifications
            SET is_read = %s
            WHERE notification_id = %s
            RETURNING notification_id, user_id, type, title, message, related_id, is_read, created_at
        """, (is_read, notification_id))
        
        row = cursor.fetchone()
        
        if not row:
            cursor.close()
            conn.close()
            return jsonify({"message": "Notification not found"}), 404
        
        conn.commit()
        
        notification = {
            "notification_id": row[0],
            "user_id": row[1],
            "type": row[2],
            "title": row[3],
            "message": row[4],
            "related_id": row[5],
            "is_read": row[6],
            "created_at": row[7].isoformat() if row[7] else None
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({"notification": notification}), 200
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error updating notification", "error": str(e)}), 500


@bp.route("/notifications/<int:notification_id>", methods=["DELETE"])
def delete_notification(notification_id):
    """
    Delete a notification
    """
    conn = get_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM notifications WHERE notification_id = %s", (notification_id,))
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({"message": "Notification not found"}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Notification deleted successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error deleting notification", "error": str(e)}), 500


@bp.route("/notifications/mark-all-read", methods=["POST"])
def mark_all_notifications_read():
    """
    Mark all notifications as read for a user
    Body: user_id
    """
    data = request.get_json()
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"message": "user_id is required"}), 400
    
    conn = get_connection()
    if not conn:
        return jsonify({"message": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))
        
        updated_count = cursor.rowcount
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"message": f"Marked {updated_count} notifications as read"}), 200
        
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Error marking notifications as read", "error": str(e)}), 500
