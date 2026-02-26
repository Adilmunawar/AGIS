importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodideReadyPromise = (async function () {
    self.postMessage({ status: 'info', message: 'Python engine loading...' });
    let pyodide = await loadPyodide();
    self.postMessage({ status: 'info', message: 'Downloading GIS libraries (pandas, shapely, geopandas)...' });
    await pyodide.loadPackage(["pandas", "shapely", "geopandas"]);
    self.postMessage({ status: 'info', message: 'Python GIS Engine Ready!' });
    return pyodide;
})();

self.onmessage = async function (e) {
    const { action, payload } = e.data;
    let pyodide = await pyodideReadyPromise;

    try {
        if (action === "DIGITIZE_MAP") {
            self.postMessage({ status: 'info', message: 'Processing buildings with GeoPandas...' });
            pyodide.globals.set("raw_geojson_string", JSON.stringify(payload.buildings));
            
            let pythonCode = `
import geopandas as gpd
import json

raw_geojson = json.loads(raw_geojson_string)
if not raw_geojson or not raw_geojson.get('features'):
    raise ValueError("No features to process")

gdf = gpd.GeoDataFrame.from_features(raw_geojson['features'])
if gdf.empty:
    raise ValueError("No features resulted in a valid GeoDataFrame")

gdf = gdf.set_crs("EPSG:4326", allow_override=True)

# Basic Sanitization placeholder
gdf['Plot_ID'] = range(1, len(gdf) + 1)
if 'Plot_Type' not in gdf.columns:
    gdf['Plot_Type'] = "Constructed Home"

# Ensure all geometries are valid
gdf['geometry'] = gdf.geometry.buffer(0)

final_geojson = gdf.to_json()
final_geojson
            `;
            
            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });
        
        } else if (action === "EXTRACT_ROADS") {
            self.postMessage({ status: 'info', message: 'Processing roads with GeoPandas...' });
            pyodide.globals.set("raw_geojson_string", JSON.stringify(payload.roads));

            let pythonCode = `
import geopandas as gpd
import json

raw_geojson = json.loads(raw_geojson_string)
if not raw_geojson or not raw_geojson.get('features'):
    raise ValueError("No features to process")
    
gdf = gpd.GeoDataFrame.from_features(raw_geojson['features'])
if gdf.empty:
    raise ValueError("No features resulted in a valid GeoDataFrame")

gdf = gdf.set_crs("EPSG:4326", allow_override=True)

# Basic Sanitization placeholder
gdf['Road_ID'] = range(1, len(gdf) + 1)
if 'highway' not in gdf.columns:
    gdf['highway'] = "unclassified"

# Ensure all geometries are valid
gdf['geometry'] = gdf.geometry.buffer(0)

final_geojson = gdf.to_json()
final_geojson
            `;
            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });
        }

    } catch (error) {
        self.postMessage({ status: 'error', message: String(error), action: action });
    }
};
