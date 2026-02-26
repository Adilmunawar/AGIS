# ==============================================================================
#           AGIS - OVERTURE MAPS EXTRACTION BACKEND (COLAB)
# ==============================================================================
#
# INSTRUCTIONS:
# 1. RUN THIS CELL. It will install dependencies and then stop.
# 2. RUN THIS CELL AGAIN. It will now start the backend server.
#
# It will output a public ngrok URL (e.g., https://...).
# Paste this URL into your AGIS web app's "Server Config" page.
#
# ==============================================================================

import sys
import subprocess

# --- Step 1: Dependency Check ---
try:
    import leafmap
    print("--- Dependencies are already installed. ---")
    run_server = True
except ImportError:
    print("--- Installing required packages... This may take a few minutes. ---")
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "flask",
            "flask-cors",
            "pyngrok",
            "geopandas",
            "leafmap",
            "duckdb",
            "pyarrow"
        ],
        check=True,
    )
    print("\n" + "=" * 80)
    print("IMPORTANT: Packages installed. Please RE-RUN THIS CELL to start the server.")
    print("=" * 80 + "\n")
    run_server = False

# --- Main Execution Block ---
if run_server:
    # --- Step 2: Import all libraries ---
    import io
    import threading
    import os
    import json
    import logging
    import geopandas as gpd
    import leafmap.overture as overture
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    from pyngrok import ngrok

    # --- Step 3: Backend Server Configuration and Logic ---
    PORT = 8080

    app = Flask(__name__)
    CORS(app)
    logging.getLogger('werkzeug').setLevel(logging.ERROR)

    @app.route("/")
    def index():
        return "<h1>AGIS Realtime Engine - Colab Backend</h1><p>The backend is running correctly.</p>"

    @app.route("/health")
    def health_check():
        return jsonify({"status": "ok"}), 200

    @app.route('/extract_overture', methods=['POST'])
    def extract_overture_endpoint():
        try:
            data = request.json
            bbox = data['bbox']           # Expected: [west, south, east, north]
            theme_type = data['type'] # Expected: 'building' or 'segment'

            print(f"\n🌍 Request: BBox {bbox}, Type: {theme_type}")

            theme = ''
            gdf_type = ''
            if theme_type == 'building':
                theme = 'buildings'
                gdf_type = 'building_part'
            elif theme_type == 'segment':
                theme = 'transportation'
                gdf_type = 'segment'
            else:
                return jsonify({"error": "Invalid extraction type specified"}), 400

            print(f"🗺️  Querying Overture Maps for theme '{theme}'...")
            gdf = overture.overture_data(bbox=bbox, theme=theme, type=gdf_type)

            if gdf.empty:
                print("-> No features found in the specified area.")
                return jsonify(json.loads('{"type": "FeatureCollection", "features": []}'))

            print(f"-> Extraction successful: {len(gdf)} features found.")
            return jsonify(json.loads(gdf.to_json()))

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": "An internal error occurred", "details": str(e)}), 500


    def run_app():
        app.run(port=PORT, use_reloader=False)

    # --- Step 4: Start the server and ngrok tunnel ---
    if __name__ == '__main__':
        print("--- Starting Flask server and ngrok tunnel... ---")
        ngrok.kill() # Ensure no old tunnels are running
        public_url = ngrok.connect(PORT).public_url
        print("=" * 80)
        print(f" * AGIS REALTIME ENGINE IS LIVE! *")
        print(f" * Copy this URL and paste it into your AGIS web application: {public_url}")
        print("==============================================================================")

        threading.Thread(target=run_app).start()
