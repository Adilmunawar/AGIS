
importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodideReadyPromise = async function () {
    let pyodide = await loadPyodide();
    postMessage({ status: 'info', message: 'Initializing Python Engine...' });
    await pyodide.loadPackage(["pandas", "geopandas", "shapely"]);
    postMessage({ status: 'info', message: 'Export Engine Ready.' });
    return pyodide;
}();

self.onmessage = async function (e) {
    const { action, payload } = e.data;
    let pyodide = await pyodideReadyPromise;

    try {
        if (action === "CONVERT_SHAPEFILE") {
            postMessage({ status: 'info', message: 'Converting to Shapefile...' });
            pyodide.globals.set("raw_geojson", payload);
            
            let pythonCode = `
import geopandas as gpd
import os

gdf = gpd.read_file(raw_geojson)

# Ensure the /tmp directory exists in virtual RAM
os.makedirs('/tmp', exist_ok=True)

# Export as Shapefile
gdf.to_file("/tmp/export.shp")
            `;
            
            await pyodide.runPythonAsync(pythonCode);
            
            // Read the binary files out of Pyodide's Virtual File System into JS
            const shp = pyodide.FS.readFile('/tmp/export.shp', { encoding: 'binary' });
            const shx = pyodide.FS.readFile('/tmp/export.shx', { encoding: 'binary' });
            const dbf = pyodide.FS.readFile('/tmp/export.dbf', { encoding: 'binary' });
            const prj = pyodide.FS.readFile('/tmp/export.prj', { encoding: 'binary' });
            
            pyodide.FS.unlink('/tmp/export.shp');
            pyodide.FS.unlink('/tmp/export.shx');
            pyodide.FS.unlink('/tmp/export.dbf');
            pyodide.FS.unlink('/tmp/export.prj');

            self.postMessage({ 
                status: 'success', 
                action: action, 
                payload: { shp, shx, dbf, prj } 
            });
        }
    } catch (error) {
        self.postMessage({ status: 'error', action: action, message: error.message });
    }
};
