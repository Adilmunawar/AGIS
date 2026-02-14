import sys
import subprocess

try:
    import segment_geospatial
except ImportError:
    print("--- Installing dependencies... ---")
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", "-q",
        "segment-geospatial", "leafmap", "geopandas",
        "pyngrok", "flask-cors", "rasterio", "flask"
    ])
    print("\n--- Dependencies installed. Please run this cell again. ---")
    sys.exit()

import io
import zipfile
import threading
import tempfile
import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pyngrok import ngrok
import geopandas as gpd
from shapely.geometry import box
import leafmap
from segment_geospatial import SamGeo

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

    sam = SamGeo(model_type="vit_h", automatic=True, device="cuda")
    
    output_masks = "segmentation_masks.tif"
    sam.generate(source=image_path, output=output_masks, foreground=True, erosion_kernel=(3,3))

    output_geojson = "detected_buildings.geojson"
    sam.raster_to_vector(output_masks, output_geojson)

    gdf = gpd.read_file(output_geojson)
    for path in [image_path, output_masks, output_geojson]:
        if os.path.exists(path):
            os.remove(path)
    print("-> Detection pipeline finished.")
    return gdf

def calculate_areas(gdf):
    if gdf.empty:
        return gdf
    gdf_proj = gdf.to_crs(CRS)
    gdf['area_sqm'] = gdf_proj.geometry.area
    gdf['area_marla'] = gdf['area_sqm'] / SQM_TO_MARLA
    return gdf

@app.route("/")
def index():
    return "<h1>Satellite Vision Colab Backend</h1><p>The backend is running.</p>"

@app.route('/detect_bbox', methods=['POST'])
def detect_bbox_endpoint():
    global last_geojson_result
    data = request.get_json()
    if not data or 'bbox' not in data:
        return jsonify({"error": "Invalid 'bbox' in request"}), 400

    try:
        detected_gdf = perform_detection(data['bbox'])
        results_gdf = calculate_areas(detected_gdf)
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
        return "No detection has been run yet.", 404

    try:
        gdf = gpd.read_file(last_geojson_result)
        zip_buffer = io.BytesIO()
        with tempfile.TemporaryDirectory() as tmpdir:
            shapefile_path = os.path.join(tmpdir, 'detected_buildings.shp')
            gdf.to_file(shapefile_path, driver='ESRI Shapefile', crs=gdf.crs)
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
    app.run(port=PORT, use_reloader=False)

if __name__ == '__main__':
    print("--- Dependencies ready, starting server... ---")
    ngrok.kill()
    public_url = ngrok.connect(PORT)
    print(f"* Backend is live! Connect the frontend to this URL: {public_url}")
    threading.Thread(target=run_app).start()
