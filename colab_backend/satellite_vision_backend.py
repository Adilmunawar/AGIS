# ==============================================================================
#      SATELLITE VISION - GOOGLE COLAB BACKEND (SINGLE SCRIPT)
# ==============================================================================
#
# INSTRUCTIONS:
#
# 1. SETUP A FREE NGROK ACCOUNT:
#    - Go to https://dashboard.ngrok.com/signup
#    - After signing up, find your Authtoken here:
#      https://dashboard.ngrok.com/get-started/your-authtoken
#
# 2. RUN THE NGROK CONFIG COMMAND (ONLY ONCE):
#    - Open a NEW, SEPARATE Colab notebook or use a new cell in your existing one.
#    - Paste and run the following command, replacing `PASTE_YOUR_TOKEN_HERE`
#      with your actual ngrok authtoken.
#
#      !ngrok config add-authtoken PASTE_YOUR_TOKEN_HERE
#
# 3. RUN THIS SCRIPT:
#    - Copy the ENTIRE content of this file into a SINGLE cell in your Colab
#      notebook.
#    - Make sure your Colab Runtime is set to a GPU (Runtime > Change runtime type > T4 GPU).
#    - Run the cell.
#
#    The script will first install all necessary libraries and then start the
#    backend server. It will output a public ngrok URL (e.g., https://...).
#    Paste this URL into the "Connect Server" input in your web application.
#
# ==============================================================================

import subprocess
import sys
import os

# --- Step 1: Install Dependencies ---
print("--- Checking and installing dependencies... ---")
# Using a quiet install to keep the output clean.
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "flask", "flask-cors", "pyngrok", "geopandas", "leafmap", "segment-geospatial", "rasterio"], check=True)
print("--- Dependencies are ready. ---")

# --- Step 2: Import libraries AFTER installation ---
import io
import zipfile
import threading
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pyngrok import ngrok
import geopandas as gpd
from shapely.geometry import box
import leafmap
from segment_geospatial import SamGeo

# --- Step 3: Backend Server Configuration and Logic ---
PORT = 8080
CRS = "EPSG:32643"
SQM_TO_MARLA = 25.2929
last_geojson_result = None

app = Flask(__name__)
CORS(app)

def perform_detection(bbox):
    print(f"Starting detection for BBox: {bbox}")
    image_path = "satellite_image.tif"
    leafmap.geotiff_from_bbox(
        output=image_path, bbox=bbox, zoom=19, source='Satellite', overwrite=True
    )

    # Use a GPU if available
    sam = SamGeo(model_type="vit_h", automatic=True, device="cuda")
    
    output_masks = "segmentation_masks.tif"
    # Erode the masks to remove small artifacts and separate close objects
    sam.generate(source=image_path, output=output_masks, foreground=True, erosion_kernel=(3,3))

    output_geojson = "detected_buildings.geojson"
    sam.raster_to_vector(output_masks, output_geojson)

    gdf = gpd.read_file(output_geojson)
    # Clean up intermediate files
    for path in [image_path, output_masks, output_geojson]:
        if os.path.exists(path):
            os.remove(path)
    print("-> Detection pipeline finished.")
    return gdf

def calculate_areas(gdf):
    if gdf.empty:
        return gdf
    # Project to a CRS with meters as units for accurate area calculation
    gdf_proj = gdf.to_crs(CRS)
    gdf['area_sqm'] = gdf_proj.geometry.area
    gdf['area_marla'] = gdf['area_sqm'] / SQM_TO_MARLA
    return gdf

@app.route("/")
def index():
    return "<h1>Satellite Vision Colab Backend</h1><p>The backend is running correctly.</p>"

@app.route('/detect_bbox', methods=['POST'])
def detect_bbox_endpoint():
    global last_geojson_result
    data = request.get_json()
    if not data or 'bbox' not in data:
        return jsonify({"error": "Invalid 'bbox' in request"}), 400

    try:
        detected_gdf = perform_detection(data['bbox'])
        results_gdf = calculate_areas(detected_gdf)
        # Store the result in memory for the shapefile download
        last_geojson_result = results_gdf.to_json()
        print(f"-> Detection successful: {len(results_gdf)} buildings found.")
        return last_geojson_result, 200, {'Content-Type': 'application/json'}
    except Exception as e:
        print(f"[ERROR] Detection failed: {e}")
        return jsonify({"error": "An internal error occurred", "details": str(e)}), 500

@app.route('/download_shp', methods=['GET'])
def download_shp_endpoint():
    global last_geojson_result
    if last_geojson_result is None:
        return "No detection has been run yet. Please run a detection first.", 404

    try:
        # Create GeoDataFrame from the stored GeoJSON string
        gdf = gpd.read_file(last_geojson_result)
        
        # Use an in-memory buffer for the zip file
        zip_buffer = io.BytesIO()
        with tempfile.TemporaryDirectory() as tmpdir:
            shapefile_path = os.path.join(tmpdir, 'detected_buildings.shp')
            # Save the GeoDataFrame to a shapefile
            gdf.to_file(shapefile_path, driver='ESRI Shapefile', crs=gdf.crs)
            
            # Zip all the component files of the shapefile
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
                for root, _, files in os.walk(tmpdir):
                    for file in files:
                        zf.write(os.path.join(root, file), arcname=file)
                        
        zip_buffer.seek(0)
        
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name='detected_buildings.zip'
        )
    except Exception as e:
        print(f"[ERROR] Shapefile creation failed: {e}")
        return jsonify({"error": "Failed to create shapefile", "details": str(e)}), 500

def run_app():
    # Use reloader=False to prevent the app from starting twice
    app.run(port=PORT, use_reloader=False)

# --- Step 4: Start the server and ngrok tunnel ---
if __name__ == '__main__':
    print("--- Starting Flask server and ngrok tunnel... ---")
    # Kill any existing ngrok tunnels
    ngrok.kill()
    # Start ngrok tunnel
    public_url = ngrok.connect(PORT)
    print("==============================================================================")
    print(f" * BACKEND IS LIVE! *")
    print(f" * Copy this URL and paste it into your web application: {public_url}")
    print("==============================================================================")
    
    # Run Flask app in a separate thread
    threading.Thread(target=run_app).start()
