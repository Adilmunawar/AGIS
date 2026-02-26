
importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodideReadyPromise = async function () {
    let pyodide = await loadPyodide();
    postMessage({ status: 'info', message: 'Initializing Python Engine...' });
    await pyodide.loadPackage(["pandas", "geopandas", "shapely"]);
    postMessage({ status: 'info', message: 'GIS Engine Ready.' });
    return pyodide;
}();

self.onmessage = async function (e) {
    const { action, payload } = e.data;
    let pyodide = await pyodideReadyPromise;

    try {
        if (action === "DIGITIZE_MAP") {
            postMessage({ status: 'info', message: 'Processing building footprints...' });
            pyodide.globals.set("raw_buildings_json", JSON.stringify(payload.buildings));
            
            let pythonCode = `
import geopandas as gpd
import json

# Load the data passed from Next.js
gdf = gpd.read_file(raw_buildings_json)

# Basic Sanitization placeholder
if 'Plot_ID' not in gdf.columns:
    gdf['Plot_ID'] = [f"PLOT_{i+1}" for i in range(len(gdf))]
if 'Plot_Type' not in gdf.columns:
    gdf['Plot_Type'] = "Constructed Home"

final_geojson = gdf.to_json()
final_geojson
            `;
            
            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });
        }
    } catch (error) {
        self.postMessage({ status: 'error', action: action, message: error.message });
    }
};
