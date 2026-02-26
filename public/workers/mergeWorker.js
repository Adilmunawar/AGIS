
importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodideReadyPromise = async function () {
    let pyodide = await loadPyodide();
    postMessage({ status: 'info', message: 'Initializing Python Engine...' });
    await pyodide.loadPackage(["pandas", "geopandas", "shapely"]);
    postMessage({ status: 'info', message: 'Merge Engine Ready.' });
    return pyodide;
}();

self.onmessage = async function (e) {
    const { action, payload } = e.data; // payload is an array of GeoJSON strings
    let pyodide = await pyodideReadyPromise;

    try {
        if (action === "MERGE_JSONS") {
            postMessage({ status: 'info', message: 'Merging files with Python...' });
            
            // 1. Create a temp directory in virtual RAM
            pyodide.FS.mkdirTree('/tmp/merge');
            
            // 2. Write all JS strings to the virtual file system BEFORE running Python
            payload.forEach((jsonString, index) => {
                pyodide.FS.writeFile(`/tmp/merge/file_${index}.geojson`, jsonString);
            });

            // 3. Run Python to read from the virtual disk
            let pythonCode = `
import geopandas as gpd
import pandas as pd
import glob
import os

# Find all files we just wrote to virtual RAM
file_paths = glob.glob('/tmp/merge/*.geojson')

if file_paths:
    # Load them into a list of GeoDataFrames
    gdfs = [gpd.read_file(fp) for fp in file_paths]

    # Merge them
    master_gdf = pd.concat(gdfs, ignore_index=True)
    # Dissolve internal overlapping boundaries
    master_gdf = master_gdf.explode(index_parts=False).reset_index(drop=True)
    final_json = master_gdf.to_json()

    # Clean up virtual RAM
    for fp in file_paths:
        os.remove(fp)
else:
    final_json = '{"type": "FeatureCollection", "features": []}'

final_json
            `;
            
            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });
        }
    } catch (error) {
        self.postMessage({ status: 'error', action: action, message: error.message });
    }
};
