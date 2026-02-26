importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodideReadyPromise = (async function () {
    self.postMessage({ status: 'info', message: 'Initializing Python Engine...' });
    let pyodide = await loadPyodide();
    self.postMessage({ status: 'info', message: 'Downloading GIS Libraries...' });
    await pyodide.loadPackage(["pandas", "shapely", "geopandas"]);
    self.postMessage({ status: 'info', message: 'Python Engine Ready!' });
    return pyodide;
})();

self.onmessage = async function (e) {
    const { action, payload } = e.data;
    let pyodide = await pyodideReadyPromise;

    try {
        if (action === "DIGITIZE_MAP") {
            // 1. Pass JS data to Python
            pyodide.globals.set("raw_buildings_json", JSON.stringify(payload.buildings));
            
            // 2. Placeholder Python Script (Basic Sanitization for now)
            let pythonCode = `
import geopandas as gpd
import json

# Load the data passed from Next.js
gdf = gpd.read_file(raw_buildings_json)

# Basic Sanitization placeholder (We will inject the complex mosaic script later)
gdf['Plot_ID'] = ""
if 'Plot_Type' not in gdf.columns:
    gdf['Plot_Type'] = "Constructed Home"

final_geojson = gdf.to_json()
final_geojson
            `;
            
            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });
        }
        // ... Handle MERGE_JSONS and EXPORT_SHAPEFILE similarly
    } catch (error) {
        self.postMessage({ status: 'error', action: action, message: error.message });
    }
};
