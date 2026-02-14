# ==============================================================================
#      SATELLITE VISION - GOOGLE COLAB BACKEND (SINGLE SCRIPT)
# ==============================================================================
#
# INSTRUCTIONS:
# 1. RUN THIS CELL. It will install dependencies and then stop.
# 2. RUN THIS CELL AGAIN. It will now start the backend server.
#
# It will output a public ngrok URL (e.g., https://...).
# Paste this URL into your web app. Don't forget to set your ngrok token first
# in a separate cell as per the README.
#
# ==============================================================================

import sys
import subprocess

# --- Step 1: Dependency Check ---
# We try to import a core dependency. If it fails, we install all packages
# and stop. The user must then re-run the cell.
try:
    import segment_geospatial
    print("--- Dependencies are already installed. ---")
    run_server = True
except ImportError:
    print("--- Installing required packages... ---")
    # Using sys.executable ensures we use the pip associated with the current kernel
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "-q", # quiet install
            "flask",
            "flask-cors",
            "pyngrok",
            "geopandas",
            "leafmap",
            "segment-geospatial",
            "rasterio",
            "scikit-image",
        ],
        check=True,
    )
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "-U",
            "segment-geospatial[samgeo2]",
        ],
        check=True,
    )
    print("\n" + "=" * 80)
    print("IMPORTANT: Packages installed. Please RE-RUN THIS CELL to start the server.")
    print("=" * 80 + "\n")
    run_server = False

# --- Main Execution Block ---
# This block only runs if the dependency check passed (i.e., on the second run)
if run_server:
    # --- Step 2: Import all libraries ---
    import io
    import zipfile
    import threading
    import tempfile
    import os
    import json
    import shutil
    import logging
    import rasterio
    import numpy as np
    from flask import Flask, request, jsonify, send_file
    from flask_cors import CORS
    from pyngrok import ngrok
    import geopandas as gpd
    from shapely.geometry import box
    import leafmap
    from samgeo import SamGeo2
    from samgeo.common import regularize
    from skimage import exposure


    # --- Step 3: Backend Server Configuration and Logic ---
    PORT = 8080
    MODEL_ID = "sam2-hiera-large"
    PAKISTAN_UTM_EPSG = "EPSG:32643"
    LATEST_RESULT_PATH = os.path.join(tempfile.gettempdir(), "latest_village.geojson")

    app = Flask(__name__)
    CORS(app)
    logging.getLogger('werkzeug').setLevel(logging.ERROR)

    def enhance_image_advanced(input_path, output_path):
        print("🎨 Enhancing image...")
        try:
            with rasterio.open(input_path) as src:
                profile = src.profile
                img = src.read()
                img_norm = img / 255.0
                img_enhanced = np.zeros_like(img_norm)
                for i in range(img.shape[0]):
                    img_enhanced[i] = exposure.equalize_adapthist(img_norm[i], clip_limit=0.03)
                img_final = (img_enhanced * 255).astype(np.uint8)
                with rasterio.open(output_path, 'w', **profile) as dst:
                    dst.write(img_final)
            return True
        except: return False


    @app.route("/")
    def index():
        return "<h1>Satellite Vision Colab Backend</h1><p>The backend is running correctly.</p>"

    @app.route('/detect_bbox', methods=['POST'])
    def detect_bbox_endpoint():
        try:
            data = request.json
            bbox = data['bbox']
            points = data.get('points', []) # Get points from frontend

            print(f"\n🌍 Request: {bbox}")
            if points: print(f"👆 User clicked {len(points)} points!")

            temp_dir = tempfile.mkdtemp()
            raw_image_path = os.path.join(temp_dir, "raw.tif")
            enhanced_image_path = os.path.join(temp_dir, "enhanced.tif")
            mask_path = os.path.join(temp_dir, "mask.tif")
            vector_path = os.path.join(temp_dir, "vector.geojson")
            final_path = os.path.join(temp_dir, "final.geojson")

            # 1. Download Image
            try:
                leafmap.geotiff_from_bbox(
                    output=raw_image_path, bbox=bbox, zoom=19,
                    source="Satellite", overwrite=True
                )
            except Exception as e:
                print(f"Zoom 19 failed, trying zoom 18. Error: {e}")
                leafmap.geotiff_from_bbox(
                    output=raw_image_path, bbox=bbox, zoom=18,
                    source="Satellite", overwrite=True
                )

            enhance_image_advanced(raw_image_path, enhanced_image_path)
            target_image = enhanced_image_path

            # 2. Convert Points (Lat/Lon) -> Pixels (Row/Col)
            pixel_prompts = []
            if len(points) > 0:
                with rasterio.open(raw_image_path) as src:
                    for p in points:
                        # Input is [lng, lat] for rasterio index
                        # Note: src.index returns (row, col). SAM needs (x, y) which is (col, row)
                        row, col = src.index(p['lng'], p['lat'])
                        pixel_prompts.append([col, row])
                print(f"📍 Converted {len(pixel_prompts)} points to pixels.")

            # 3. AI Detection
            sam = SamGeo2(model_id=MODEL_ID, automatic=(len(pixel_prompts) == 0))
            sam.set_image(target_image) # Use enhanced image

            if len(pixel_prompts) > 0:
                # --- INTERACTIVE MODE ---
                print("🤖 Running Point-Guided Detection...")
                sam.predict_by_points(pixel_prompts, point_labels=1) # 1 = Foreground
                sam.save_prediction(mask_path)
                sam.tiff_to_vector(mask_path, vector_path)
            else:
                # --- AUTOMATIC MODE ---
                print("🤖 Running Automatic Scan...")
                sam.generate(
                    source=target_image, output=mask_path,
                    points_per_side=64, pred_iou_thresh=0.40, stability_score_thresh=0.50,
                    min_mask_region_area=30
                )
                sam.region_groups(mask_path, min_size=30, out_vector=vector_path)

            # 4. Save & Regularize
            gdf_final = gpd.GeoDataFrame(columns=['geometry'], crs="EPSG:4326")
            if os.path.exists(vector_path):
                try:
                    regularize(vector_path, final_path)
                    gdf = gpd.read_file(final_path)
                    if not gdf.empty:
                        gdf_utm = gdf.to_crs(PAKISTAN_UTM_EPSG)
                        gdf_utm['area_sqm'] = gdf_utm.area
                        gdf_utm['area_mrl'] = gdf_utm['area_sqm'] / 25.2929
                        gdf_final = gdf_utm.to_crs("EPSG:4326")
                except Exception as e:
                    print(f"[ERROR] Could not regularize or calculate area: {e}")
                    if os.path.exists(vector_path): gdf_final = gpd.read_file(vector_path)

            # Always save
            if os.path.exists(LATEST_RESULT_PATH): os.remove(LATEST_RESULT_PATH)
            gdf_final.to_file(LATEST_RESULT_PATH, driver='GeoJSON')
            shutil.rmtree(temp_dir)
            print(f"-> Detection successful: {len(gdf_final)} buildings found.")
            return jsonify(json.loads(gdf_final.to_json()))

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": "An internal error occurred", "details": str(e)}), 500

    @app.route('/download_shp', methods=['GET'])
    def download_shp_endpoint():
        try:
            if not os.path.exists(LATEST_RESULT_PATH):
                return "No detection has been run yet. Please run a detection first.", 404

            shp_dir = os.path.join(tempfile.gettempdir(), "arcgis_export")
            if os.path.exists(shp_dir): shutil.rmtree(shp_dir)
            os.makedirs(shp_dir)

            gdf = gpd.read_file(LATEST_RESULT_PATH)
            gdf.to_file(os.path.join(shp_dir, "buildings.shp"), driver="ESRI Shapefile")

            zip_path_base = os.path.join(tempfile.gettempdir(), "village_data")
            zip_path = shutil.make_archive(zip_path_base, 'zip', shp_dir)
            return send_file(zip_path, as_attachment=True, download_name="detected_buildings.zip")
        except Exception as e:
            print(f"[ERROR] Shapefile creation failed: {e}")
            return jsonify({"error": "Failed to create shapefile", "details": str(e)}), 500


    def run_app():
        # Use reloader=False to prevent the app from starting twice
        app.run(port=PORT, use_reloader=False)

    # --- Step 4: Start the server and ngrok tunnel ---
    if __name__ == '__main__':
        print("--- Starting Flask server and ngrok tunnel... ---")
        # Kill any existing ngrok tunnels to ensure a clean start
        ngrok.kill()
        # Start ngrok tunnel
        public_url = ngrok.connect(PORT)
        print("==============================================================================")
        print(f" * BACKEND IS LIVE! *")
        print(f" * Copy this URL and paste it into your web application: {public_url}")
        print("==============================================================================")

        threading.Thread(target=run_app).start()
