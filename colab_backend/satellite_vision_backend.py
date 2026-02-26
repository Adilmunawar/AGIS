# ==============================================================================
# AGIS ENGINE - CORE SERVICE MODULE
# System: Google Colab Runtime (Safe-Mode)
# Network Configuration: Port 8888 | Cloudflare Tunneling Service
# ==============================================================================

import sys
import subprocess
import os
import time
import threading
import tempfile
import json

# --- SYSTEM INITIALIZATION: NETWORK PURGE ---
print("[SYSTEM] Initializing network stack and clearing active ports...")
!fuser -k 8888/tcp > /dev/null 2>&1
!pkill -f cloudflared > /dev/null 2>&1
time.sleep(2)

# --- DEPENDENCY MANAGEMENT ---
print("[SYSTEM] Installing core GIS dependencies and Overture Maps SDK...")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "flask", "flask-cors", "overturemaps", "geopandas"], check=True)

import geopandas as gpd
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- BACKEND SERVER CONFIGURATION ---
app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Service health monitoring endpoint."""
    return jsonify({
        "status": "online",
        "message": "AGIS Realtime Engine service is operational."
    }), 200

@app.route('/extract_overture', methods=['POST'])
def extract_overture_endpoint():
    """Endpoint for Overture Maps data extraction."""
    try:
        data = request.json
        bbox = data.get('bbox')
        map_type = data.get('type', 'building')

        # Format bounding box for Overture Maps SDK
        bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
        raw_geojson = os.path.join(tempfile.gettempdir(), f"raw_data_{map_type}.geojson")

        if os.path.exists(raw_geojson):
            os.remove(raw_geojson)

        # Execute SDK download command
        cmd = ["overturemaps", "download", "--bbox", bbox_str, "-f", "geojson", "--type", map_type, "-o", raw_geojson]
        subprocess.run(cmd, capture_output=True, text=True)

        # Process and sanitize geospatial data
        gdf = gpd.read_file(raw_geojson)
        if gdf.empty:
            return jsonify({"type": "FeatureCollection", "features": []})

        # Maintain only required geometry for transfer efficiency
        gdf_clean = gdf[['geometry']].copy()
        gdf_clean['Plot_ID'] = ''

        # Cleanup temporary filesystem resources
        os.remove(raw_geojson)

        return jsonify(json.loads(gdf_clean.to_json()))

    except Exception as e:
        return jsonify({
            "error": "Data Extraction Failure",
            "details": str(e)
        }), 500

def start_backend_service():
    """Initializes the Flask application on the designated system port."""
    app.run(port=8888, host='0.0.0.0', use_reloader=False)

# --- SERVICE DEPLOYMENT ---
print("[SYSTEM] Deploying local server and initializing secure tunnel...")
!wget -q -c -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
!chmod +x cloudflared-linux-amd64

threading.Thread(target=start_backend_service, daemon=True).start()
time.sleep(3)

# --- NETWORK TUNNELING: ENDPOINT GENERATION ---
print("[SYSTEM] Generating secure public API endpoint...")
process = subprocess.Popen(
    ['./cloudflared-linux-amd64', 'tunnel', '--url', 'http://127.0.0.1:8888'],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True
)

endpoint_url = ''
print("-" * 80)
for line in process.stdout:
    if "trycloudflare.com" in line:
        parts = line.split(" ")
        for part in parts:
            if "trycloudflare.com" in part:
                endpoint_url = part
                print(f"[STATUS] AGIS REALTIME ENGINE IS ONLINE")
                print(f"[ENDPOINT] AGIS SERVER CONFIG: {endpoint_url}")
                print("-" * 80)
                break
    if endpoint_url:
        break

process.wait()
