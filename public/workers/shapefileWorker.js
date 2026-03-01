importScripts(
  'https://unpkg.com/jszip/dist/jszip.min.js', 
  'https://unpkg.com/proj4/dist/proj4.js',
  'https://unpkg.com/shpjs@latest/dist/shp.js'
);

// Define standard projection for Pakistan/Punjab (UTM Zone 43N), which corresponds to EPSG:32643
proj4.defs("EPSG:32643", "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs");

self.onmessage = async (e) => {
  // Correctly extract the files array and the layer identifier
  const { files, layer } = e.data;

  if (!files || !Array.isArray(files) || files.length === 0) {
    postMessage({ status: 'error', message: 'No files were received by the worker.', layer });
    return;
  }

  try {
    const zip = new JSZip();
    
    // Find the .prj file to determine the projection
    const prjFile = files.find(f => f.name.toLowerCase().endsWith('.prj'));
    let needsReprojection = false;
    
    if (prjFile) {
      const prjText = await prjFile.text();
      // Simple check for UTM Zone 43N. A more robust solution might parse the WKT string.
      if (prjText.includes('UTM_Zone_43N')) {
        needsReprojection = true;
      }
    }
    
    // Add all files to a virtual zip
    const fileReadPromises = files.map(file => {
      return file.arrayBuffer().then(buffer => {
        zip.file(file.name, buffer);
      });
    });
    await Promise.all(fileReadPromises);

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // Parse shapefile(s) from the buffer. shpjs can return a single object or an array.
    const geojsonResult = await shp(zipBuffer);
    const collections = Array.isArray(geojsonResult) ? geojsonResult : [geojsonResult];

    let combinedFeatures = [];
    const utmToWgs84 = proj4("EPSG:32643", "EPSG:4326"); // From UTM 43N to WGS84 Lat/Lon

    collections.forEach(collection => {
      if (collection && collection.features) {
        collection.features.forEach(feature => {
            // Reproject coordinates if the .prj file indicated UTM
            if (needsReprojection && feature.geometry) {
                switch(feature.geometry.type) {
                    case 'Point':
                        feature.geometry.coordinates = utmToWgs84.forward(feature.geometry.coordinates);
                        break;
                    case 'LineString':
                    case 'MultiPoint':
                        feature.geometry.coordinates = feature.geometry.coordinates.map(coord => utmToWgs84.forward(coord));
                        break;
                    case 'Polygon':
                    case 'MultiLineString':
                        feature.geometry.coordinates = feature.geometry.coordinates.map(ring => ring.map(coord => utmToWgs84.forward(coord)));
                        break;
                    case 'MultiPolygon':
                         feature.geometry.coordinates = feature.geometry.coordinates.map(poly => poly.map(ring => ring.map(coord => utmToWgs84.forward(coord))));
                        break;
                }
            }
        });
        combinedFeatures.push(...collection.features);
      }
    });
    
    if (combinedFeatures.length === 0) {
        throw new Error("Could not parse any valid features from the provided files.");
    }
    
    let columns = [];
    if (combinedFeatures[0]?.properties) {
      columns = Object.keys(combinedFeatures[0].properties);
    }
    
    const finalGeoJSON = {
      type: "FeatureCollection",
      features: combinedFeatures
    };

    postMessage({
      status: 'success',
      geojson: finalGeoJSON,
      columns: columns,
      layer: layer, // Echo the layer back to the client
    });

  } catch (error) {
    postMessage({
      status: 'error',
      message: error.message || 'An unknown error occurred while parsing the shapefile.',
      layer: layer, // Echo layer back on error too
    });
  }
};
