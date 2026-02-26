importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodideReadyPromise = (async function () {
    self.postMessage({ status: 'info', message: 'Initializing Python Engine...' });
    let pyodide = await loadPyodide();
    self.postMessage({ status: 'info', message: 'Downloading GIS Libraries...' });
    await pyodide.loadPackage(["pandas", "shapely", "geopandas"]);
    self.postMessage({ status: 'info', message: 'Python Engine Ready!' });
    return pyodide;
})();


// Helper to convert OSM JSON to GeoJSON for buildings
function osmToGeoJSON(osmData) {
  const features = osmData.elements
    .filter((element) => element.type === 'way' && element.nodes)
    .map((way) => {
      const coordinates = way.nodes.map((nodeId) => {
        const node = osmData.elements.find((el) => el.id === nodeId);
        return node ? [node.lon, node.lat] : null;
      }).filter(Boolean);

      if (coordinates.length > 1 && JSON.stringify(coordinates[0]) !== JSON.stringify(coordinates[coordinates.length - 1])) {
        coordinates.push(coordinates[0]);
      }
      
      if (coordinates.length < 4) return null;

      return {
        type: 'Feature',
        properties: way.tags || {},
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      };
    }).filter(Boolean);

  return { type: 'FeatureCollection', features: features };
}

// Helper to convert OSM JSON to GeoJSON for roads
function osmToGeoJSONRoads(osmData) {
    const features = osmData.elements
        .filter(element => element.type === 'way' && element.nodes)
        .map(way => {
            const coordinates = way.nodes.map(nodeId => {
                const node = osmData.elements.find(el => el.id === nodeId);
                return node ? [node.lon, node.lat] : null;
            }).filter(Boolean);

            if (coordinates.length < 2) return null;

            return {
                type: 'Feature',
                properties: way.tags || {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates,
                },
            };
        }).filter(Boolean);

    return { type: 'FeatureCollection', features };
}


self.onmessage = async function (e) {
    const { action, payload } = e.data;
    let pyodide = await pyodideReadyPromise;

    try {
        if (action === "DIGITIZE_MAP") {
            const buildingsGeoJSON = osmToGeoJSON(payload.buildings);

            if (!buildingsGeoJSON || buildingsGeoJSON.features.length === 0) {
                 self.postMessage({ status: 'error', message: "No building features could be extracted from the data." });
                 return;
            }

            pyodide.globals.set("raw_buildings_json", JSON.stringify(buildingsGeoJSON));
            
            let pythonCode = `
import geopandas as gpd
import json

gdf = gpd.read_file(raw_buildings_json)

gdf['Plot_ID'] = ""
if 'Plot_Type' not in gdf.columns:
    gdf['Plot_Type'] = "Constructed Home"

final_geojson = gdf.to_json()
final_geojson
            `;
            
            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });
        } else if (action === "EXTRACT_ROADS") {
            const roadsGeoJSON = osmToGeoJSONRoads(payload.roads);

            if (!roadsGeoJSON || roadsGeoJSON.features.length === 0) {
                 self.postMessage({ status: 'error', message: "No road features could be extracted from the data." });
                 return;
            }
            pyodide.globals.set("raw_roads_json", JSON.stringify(roadsGeoJSON));
            let pythonCode = `
import geopandas as gpd
import json

# No special processing for roads yet, just pass through
gdf = gpd.read_file(raw_roads_json)

final_geojson = gdf.to_json()
final_geojson
            `;

            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });
        } else if (action === "MERGE_JSONS") {
            // payload is an array of GeoJSON string data
            pyodide.globals.set("json_array", payload);
            
            let pythonCode = `
import geopandas as gpd
import pandas as pd
import json

# Load each JSON string into a GeoDataFrame
gdfs = [gpd.read_file(js) for js in json_array.to_py()]

# Merge them all together
master_gdf = pd.concat(gdfs, ignore_index=True)

# Dissolve overlapping boundaries (optional but recommended for clean master maps)
if not master_gdf.empty:
    master_gdf = master_gdf.explode(index_parts=False).reset_index(drop=True)

master_gdf.to_json()
    `;
            let result = await pyodide.runPythonAsync(pythonCode);
            self.postMessage({ status: 'success', action: action, data: JSON.parse(result) });
        } else if (action === "CONVERT_SHAPEFILE") {
            pyodide.globals.set("raw_geojson", payload);
            
            // 1. Tell Python to save the shapefile to the virtual '/tmp' directory
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
            
            // 2. Read the binary files out of Pyodide's Virtual File System into JS
            const shp = pyodide.FS.readFile('/tmp/export.shp', { encoding: 'binary' });
            const shx = pyodide.FS.readFile('/tmp/export.shx', { encoding: 'binary' });
            const dbf = pyodide.FS.readFile('/tmp/export.dbf', { encoding: 'binary' });
            const prj = pyodide.FS.readFile('/tmp/export.prj', { encoding: 'binary' });
            
            // 3. Send the binary byte arrays back to Next.js
            self.postMessage({ 
                status: 'success', 
                action: action, 
                payload: { shp, shx, dbf, prj } 
            });
        }
    } catch (error) {
        self.postMessage({ status: 'error', message: error.message, action: action });
    }
};
