importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodide = null;

async function loadPyodideAndPackages() {
    self.postMessage({ status: 'info', message: "Initializing Python Engine..." });
    pyodide = await loadPyodide();
    self.postMessage({ status: 'info', message: "Downloading GIS Libraries..." });
    await pyodide.loadPackage(["pandas", "shapely", "geopandas"]);
    self.postMessage({ status: 'info', message: "Python Engine Ready." });
    return pyodide;
}
let pyodideReadyPromise = loadPyodideAndPackages();


self.onmessage = async (e) => {
    pyodide = await pyodideReadyPromise;
    const { action, payload } = e.data;

    try {
        if (action === "DIGITIZE_MAP") {
            self.postMessage({ status: 'info', message: "Processing Building Footprints..." });
            
            // The client component already converts Overpass data to GeoJSON.
            // We just need to pass the stringified GeoJSON to Python.
            pyodide.globals.set("raw_geojson_str", JSON.stringify(payload.buildings));
            
            let pythonCode = `
import geopandas as gpd
import json

# Load the GeoJSON string passed from the client
gdf = gpd.read_file(raw_geojson_str)

# Basic Sanitization placeholder
if not gdf.empty:
    gdf['Plot_ID'] = range(len(gdf))
    if 'Plot_Type' not in gdf.columns:
        gdf['Plot_Type'] = "Constructed Home"

final_geojson = gdf.to_json()
final_geojson
            `;
            
            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });

        } else if (action === "EXTRACT_ROADS") {
            self.postMessage({ status: 'info', message: "Processing Road Network..." });

            // The client component already converts Overpass data to GeoJSON.
            pyodide.globals.set("raw_geojson_str", JSON.stringify(payload.roads));
            
            let pythonCode = `
import geopandas as gpd
import json

# Load the GeoJSON string passed from the client
gdf = gpd.read_file(raw_geojson_str)

# Basic Sanitization placeholder
if not gdf.empty:
    gdf['Road_ID'] = range(len(gdf))
    if 'Road_Type' not in gdf.columns and 'highway' in gdf.columns:
        gdf['Road_Type'] = gdf['highway']

final_geojson = gdf.to_json()
final_geojson
            `;

            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });
        }
    } catch (error) {
        self.postMessage({ status: 'error', message: error.message });
    }
};
