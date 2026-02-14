# ==============================================================================
# SATELLITE VISION - GOOGLE COLAB BACKEND
# ==============================================================================
#
# INSTRUCTIONS:
# 1. Open a new Google Colab notebook.
# 2. Set the runtime to GPU (Runtime > Change runtime type > T4 GPU).
# 3. Install dependencies by running this in a cell:
#    !pip install segment-geospatial leafmap geopandas pyngrok flask-cors rasterio flask
# 4. Authenticate ngrok by running this in a cell (replace with your token):
#    !ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
# 5. Paste this entire script into a final cell and run it.
# 6. Copy the ngrok URL it outputs and paste it into the frontend application.
#
# ==============================================================================

import os
import io
import zipfile
import threading
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pyngrok import ngrok
import geopandas as gpd
from shapely.geometry import box
import leafmap
from segment_geospatial import SamGeo

# --- Configuration ---
PORT = 8080
# Use UTM Zone 43N for Pakistan for accurate area calculation in meters.
# This is crucial for converting to Marla correctly.
CRS = "EPSG:32643"
# 1 Marla = 25.2929 square meters
SQM_TO_MARLA = 25.2929

# --- Global State ---
# This will store the last detection result in memory so the /download_shp
# endpoint can access it.
last_geojson_result = None

# --- Flask App Initialization ---
app = Flask(__name__)
# Allow Cross-Origin-Resource-Sharing for requests from the web app.
CORS(app)

# --- AI & Geospatial Core Logic ---
def perform_detection(bbox):
    """
    Main function to run the building detection pipeline.
    
    Args:
        bbox (list): A list of [west, south, east, north] coordinates.

    Returns:
        geopandas.GeoDataFrame: A GeoDataFrame containing detected building polygons.
    """
    print(f"Received detection request for BBox: {bbox}")

    # 1. Download high-resolution satellite imagery for the bounding box.
    # We use a zoom level of 19 for good detail.
    print("Step 1/5: Downloading satellite imagery...")
    image_path = "satellite_image.tif"
    leafmap.geotiff_from_bbox(
        output=image_path,
        bbox=bbox,
        zoom=19,
        source='Satellite', # Google Satellite imagery
        overwrite=True,
    )
    print(" -> Imagery downloaded.")

    # 2. Initialize the Geospatial Segmentation Model.
    # This automatically downloads the Segment Anything Model (SAM) weights.
    print("Step 2/5: Initializing AI model...")
    sam = SamGeo(
        model_type="vit_h",  # vit_h is the high-quality model
        automatic=True,      # We want the model to find all objects automatically
        device="cuda",       # Use the GPU for speed
    )
    print(" -> Model initialized.")

    # 3. Perform segmentation on the downloaded image.
    # This is the core AI step where the model finds all objects.
    print("Step 3/5: Running AI segmentation...")
    # We save the output masks to a temporary file.
    output_masks = "segmentation_masks.tif"
    sam.generate(source=image_path, output=output_masks, foreground=True, erosion_kernel=(3,3))
    print(" -> Segmentation complete.")

    # 4. Convert the raster masks (pixels) to vector polygons (GeoJSON).
    print("Step 4/5: Converting raster results to vector polygons...")
    output_geojson = "detected_buildings.geojson"
    sam.raster_to_vector(output_masks, output_geojson)
    print(" -> Vector conversion complete.")

    # 5. Load the results into a GeoDataFrame for final processing.
    print("Step 5/5: Loading and cleaning results...")
    gdf = gpd.read_file(output_geojson)

    # Clean up temporary files
    if os.path.exists(image_path):
        os.remove(image_path)
    if os.path.exists(output_masks):
        os.remove(output_masks)
    if os.path.exists(output_geojson):
        os.remove(output_geojson)
        
    print(" -> Detection pipeline finished.")
    return gdf

def calculate_areas(gdf):
    """
    Calculates the area of each polygon in a GeoDataFrame.
    
    Args:
        gdf (geopandas.GeoDataFrame): The input GeoDataFrame.

    Returns:
        geopandas.GeoDataFrame: The GeoDataFrame with new 'area_sqm' and 'area_marla' columns.
    """
    if gdf.empty:
        return gdf

    # Project the data to the specified CRS (UTM Zone 43N) to get area in square meters.
    gdf_proj = gdf.to_crs(CRS)
    
    # Calculate area in square meters
    gdf['area_sqm'] = gdf_proj.geometry.area
    
    # Calculate area in Marla
    gdf['area_marla'] = gdf['area_sqm'] / SQM_TO_MARLA
    
    return gdf

# --- API Endpoints ---

@app.route("/")
def index():
    return "<h1>Satellite Vision Colab Backend</h1><p>The backend is running. Please connect from the web application.</p>"

@app.route('/detect_bbox', methods=['POST'])
def detect_bbox_endpoint():
    """
    API endpoint to handle detection requests from the frontend.
    Expects a JSON body with a 'bbox' key.
    """
    global last_geojson_result
    
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    bbox = data.get('bbox')

    if not bbox or len(bbox) != 4:
        return jsonify({"error": "Invalid or missing 'bbox' in request body"}), 400

    try:
        # Run the full detection pipeline
        detected_gdf = perform_detection(bbox)

        # Calculate areas for the detected polygons
        results_gdf = calculate_areas(detected_gdf)

        # Store the result as GeoJSON in our global variable
        last_geojson_result = results_gdf.to_json()

        print(f"Detection successful. Found {len(results_gdf)} building footprints.")
        
        # Return the GeoJSON to the frontend
        return last_geojson_result, 200, {'Content-Type': 'application/json'}

    except Exception as e:
        print(f"[ERROR] An error occurred during detection: {e}")
        return jsonify({"error": "An internal error occurred", "details": str(e)}), 500

@app.route('/download_shp', methods=['GET'])
def download_shp_endpoint():
    """
    API endpoint to handle shapefile download requests.
    Uses the last stored detection result.
    """
    global last_geojson_result
    
    if last_geojson_result is None:
        return "No detection has been run yet. Please run a detection first.", 404

    try:
        print("Shapefile download requested. Converting GeoJSON...")
        # Convert the stored GeoJSON string back to a GeoDataFrame
        gdf = gpd.read_file(last_geojson_result)

        # In-memory buffer to hold the zip file
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Create a temporary in-memory directory structure for the shapefile
            # Fiona (used by geopandas) requires a path-like object
            with gpd.io.file.fiona.drivers():
                 # Use in-memory virtual filesystem for writing shapefile components
                shapefile_vfs_path = '/vsimem/detected_buildings.shp'
                gdf.to_file(shapefile_vfs_path, driver='ESRI Shapefile')

                # Add all shapefile components to the zip file from memory
                for ext in ['shp', 'shx', 'dbf', 'prj', 'cpg']:
                    vfs_filepath = f'/vsimem/detected_buildings.{ext}'
                    # fiona may not write all file types, so check existence
                    if os.path.exists(vfs_filepath):
                         with open(vfs_filepath, 'rb') as f:
                            zf.writestr(f'detected_buildings.{ext}', f.read())
        
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
    """Function to run the Flask app."""
    app.run(port=PORT)

if __name__ == '__main__':
    # When running in Colab, this block will execute.
    
    # 1. Start ngrok tunnel in the background.
    # This will create a public URL that forwards to our local Flask app.
    public_url = ngrok.connect(PORT)
    print(f"Backend is live! Connect the frontend to this URL: {public_url}")
    
    # 2. Start the Flask app in a separate thread.
    # This prevents the app from blocking the main Colab execution thread.
    flask_thread = threading.Thread(target=run_app)
    flask_thread.start()

# Keep the main thread alive to allow background tasks to run.
# The ngrok tunnel and Flask app will continue running until this script is stopped.
try:
    while True:
        pass
except KeyboardInterrupt:
    print("Shutting down backend server...")
    ngrok.kill()
