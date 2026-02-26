
importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodideReadyPromise = async function () {
    let pyodide = await loadPyodide();
    postMessage({ status: 'info', message: 'Initializing Python Engine...' });
    await pyodide.loadPackage(["pandas", "geopandas", "shapely"]);
    postMessage({ status: 'info', message: 'Roads Engine Ready.' });
    return pyodide;
}();

self.onmessage = async function (e) {
    const { action, payload } = e.data;
    let pyodide = await pyodideReadyPromise;

    try {
        if (action === "EXTRACT_ROADS") {
            postMessage({ status: 'info', message: 'Processing road network...' });
            pyodide.globals.set("raw_roads_json", JSON.stringify(payload.roads));
            
            let pythonCode = `
import geopandas as gpd
import json

gdf = gpd.read_file(raw_roads_json)

# Basic processing placeholder
if 'road_type' not in gdf.columns:
    gdf['road_type'] = gdf['highway'].astype(str)

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
