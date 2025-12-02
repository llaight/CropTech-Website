#!/usr/bin/env python3
"""Quick test script to call backend endpoints:
- GET /api/reverse-geocode?lat=...&lon=...
- POST /api/fetch-weather  { lat, lon, field_id }

Run from project root: python backend\tools\test_endpoints.py
"""
import sys
import requests

BASE = "http://127.0.0.1:5001/api"

def call_reverse(lat, lon):
    url = f"{BASE}/reverse-geocode"
    try:
        r = requests.get(url, params={"lat": lat, "lon": lon}, timeout=10)
        print(f"REVERSE ({lat},{lon}) -> status={r.status_code}")
        try:
            print(r.json())
        except Exception:
            print(r.text)
    except Exception as e:
        print("Reverse geocode request failed:", e)


def call_fetch_weather(lat, lon, field_id=None):
    url = f"{BASE}/fetch-weather"
    payload = {"lat": lat, "lon": lon}
    if field_id is not None:
        payload['field_id'] = field_id
    try:
        r = requests.post(url, json=payload, timeout=20)
        print(f"FETCH-WEATHER ({lat},{lon}, field_id={field_id}) -> status={r.status_code}")
        try:
            print(r.json())
        except Exception:
            print(r.text)
    except Exception as e:
        print("Fetch weather request failed:", e)


if __name__ == '__main__':
    lat = 14.5995
    lon = 120.9842
    field_id = None
    if len(sys.argv) >= 3:
        try:
            lat = float(sys.argv[1])
            lon = float(sys.argv[2])
        except Exception:
            print("Invalid args, using defaults")
    if len(sys.argv) >= 4:
        try:
            field_id = int(sys.argv[3])
        except Exception:
            field_id = None

    print("Testing endpoints against:", BASE)
    call_reverse(lat, lon)
    print('\n')
    call_fetch_weather(lat, lon, field_id)
