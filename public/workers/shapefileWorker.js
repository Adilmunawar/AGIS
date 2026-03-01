// public/workers/shapefileWorker.js

// 1. IMPORT PROJ4 FIRST! This is the math engine that fixes the "Ocean Bug"
importScripts(
  'https://unpkg.com/jszip/dist/jszip.min.js', 
  'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js',
  'https://unpkg.com/shpjs@latest/dist/shp.js'
);

// 2. Pre-define Pakistan Punjab Projection (UTM Zone 43N) just in case the .prj fails
proj4.defs("EPSG:32643", "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs");

self.onmessage = async (e) => {
  const { files } = e.data;

  // Sometimes the client sends the files directly instead of inside an object
  const fileArray = files || e.data;

  if (!fileArray || !Array.isArray(fileArray) || fileArray.length === 0) {
    postMessage({ status: 'error', message: 'No files received.' });
    return;
  }

  try {
    const zip = new JSZip();

    const fileReadPromises = fileArray.map(file => {
      return file.arrayBuffer().then(buffer => {
        zip.file(file.name, buffer);
      });
    });
    await Promise.all(fileReadPromises);

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // shp.js will now automatically use the globally imported proj4 to fix coordinates!
    const geojson = await shp(zipBuffer);

    let combinedFeatures = [];
    
    // 3. FIX THE DATA DELETION BUG: Safely merge ALL uploaded shapefiles
    if (Array.isArray(geojson)) {
      geojson.forEach(collection => {
        if (collection.features) combinedFeatures.push(...collection.features);
      });
    } else if (geojson && geojson.features) {
      combinedFeatures = geojson.features;
    } else {
      throw new Error("Could not parse valid features from files.");
    }

    if (combinedFeatures.length === 0) {
      throw new Error("No valid geometry found in the shapefiles.");
    }

    const featureCollection = {
      type: "FeatureCollection",
      features: combinedFeatures
    };

    // Extract columns securely
    let columns = [];
    if (combinedFeatures.length > 0 && combinedFeatures[0].properties) {
      columns = Object.keys(combinedFeatures[0].properties);
    }
    
    postMessage({
      status: 'success',
      geojson: featureCollection,
      columns: columns,
    });

  } catch (error) {
    postMessage({
      status: 'error',
      message: error.message || 'An unknown error occurred while parsing.',
    });
  }
};
