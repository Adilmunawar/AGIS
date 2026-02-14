import os
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

# --- Configuration ---
PORT = 8080
# Use UTM Zone 43N (Pakistan) for accurate area calculation in meters.
CRS = "EPSG:32643"
# 1 Marla = 25.2929 square meters
SQM_TO_MARLA = 25.2929

# --- Global State ---
# Stores the last detection result in memory for the /download_shp endpoint.
last_geojson_result = None

# --- Flask App Initialization ---
app = Flask(__name__)
# Allow CORS for requests from the web app.
CORS(app)

# --- AI & Geospatial Core Logic ---
def perform_detection(bbox):
    """
    Runs the full building detection pipeline on a given bounding box.
    """
    print(f"Received detection request for BBox: {bbox}")

    # 1. Download satellite imagery for the bounding box.
    print("Step 1/5: Downloading satellite imagery...")
    image_path = "satellite_image.tif"
    leafmap.geotiff_from_bbox(
        output=image_path,
        bbox=bbox,
        zoom=19,
        source='Satellite',
        overwrite=True,
    )
    print(" -> Imagery downloaded.")

    # 2. Initialize the segmentation model (SAM).
    print("Step 2/5: Initializing AI model...")
    sam = SamGeo(
        model_type="vit_h",
        automatic=True,
        device="cuda",
    )
    print(" -> Model initialized.")

    # 3. Run AI segmentation to find objects in the image.
    print("Step 3/5: Running AI segmentation...")
    output_masks = "segmentation_masks.tif"
    sam.generate(source=image_path, output=output_masks, foreground=True, erosion_kernel=(3,3))
    print(" -> Segmentation complete.")

    # 4. Convert raster masks to vector polygons.
    print("Step 4/5: Converting raster to vector...")
    output_geojson = "detected_buildings.geojson"
    sam.raster_to_vector(output_masks, output_geojson)
    print(" -> Vector conversion complete.")

    # 5. Load results into a GeoDataFrame for processing.
    print("Step 5/5: Loading and cleaning results...")
    gdf = gpd.read_file(output_geojson)

    # Clean up temporary files
    for path in [image_path, output_masks, output_geojson]:
        if os.path.exists(path):
            os.remove(path)
            
    print(" -> Detection pipeline finished.")
    return gdf

def calculate_areas(gdf):
    """
    Calculates the area for each polygon in a GeoDataFrame.
    """
    if gdf.empty:
        return gdf

    # Project to the specified CRS to get area in square meters.
    gdf_proj = gdf.to_crs(CRS)
    gdf['area_sqm'] = gdf_proj.geometry.area
    gdf['area_marla'] = gdf['area_sqm'] / SQM_TO_MARLA
    
    return gdf

# --- API Endpoints ---

@app.route("/")
def index():
    return "<h1>Satellite Vision Colab Backend</h1><p>The backend is running. Connect from the web app.</p>"

@app.route('/detect_bbox', methods=['POST'])
def detect_bbox_endpoint():
    """
    API endpoint for detection requests from the frontend.
    """
    global last_geojson_result
    
    data = request.get_json()
    if not data or 'bbox' not in data:
        return jsonify({"error": "Invalid or missing 'bbox' in request body"}), 400

    try:
        detected_gdf = perform_detection(data['bbox'])
        results_gdf = calculate_areas(detected_gdf)

        # Store result for download endpoint
        last_geojson_result = results_gdf.to_json()

        print(f"Detection successful. Found {len(results_gdf)} building footprints.")
        return last_geojson_result, 200, {'Content-Type': 'application/json'}

    except Exception as e:
        print(f"[ERROR] An error occurred during detection: {e}")
        return jsonify({"error": "An internal error occurred", "details": str(e)}), 500

@app.route('/download_shp', methods=['GET'])
def download_shp_endpoint():
    """
    API endpoint to handle shapefile download requests.
    """
    global last_geojson_result
    
    if last_geojson_result is None:
        return "No detection has been run yet.", 404

    try:
        print("Shapefile download requested. Converting GeoJSON...")
        gdf = gpd.read_file(last_geojson_result)

        # In-memory buffer to hold the zip file
        zip_buffer = io.BytesIO()

        with tempfile.TemporaryDirectory() as tmpdir:
            shapefile_path = os.path.join(tmpdir, 'detected_buildings.shp')
            gdf.to_file(shapefile_path, driver='ESRI Shapefile', crs=gdf.crs)

            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
                for root, _, files in os.walk(tmpdir):
                    for file in files:
                        zf.write(os.path.join(root, file), arcname=file)
        
        zip_buffer.seek(0)
        print(" -> Shapefile zipped and ready for download.")

        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name='detected_buildings.zip'
        )
    except Exception as e:
        print(f"[ERROR] An error occurred during shapefile creation: {e}")
        return jsonify({"error": "Failed to create shapefile", "details": str(e)}), 500


# --- Server Startup ---
def run_app():
    # use_reloader=False is important in Colab to prevent the script from running twice.
    app.run(port=PORT, use_reloader=False)

if __name__ == '__main__':
    ngrok.kill()
    
    # Start ngrok tunnel to expose the local Flask app.
    public_url = ngrok.connect(PORT)
    print(f"* Backend is live! Connect the frontend to this URL: {public_url}")
    
    # Start the Flask app in a background thread.
    threading.Thread(target=run_app).start()
