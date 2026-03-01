// public/workers/shapefileWorker.js

// Import necessary libraries. These are loaded into the worker's global scope.
importScripts('https://unpkg.com/jszip/dist/jszip.min.js', 'https://unpkg.com/shpjs@latest/dist/shp.js');

self.onmessage = async (e) => {
  const { files } = e.data;

  if (!files || !Array.isArray(files) || files.length === 0) {
    postMessage({ status: 'error', message: 'No files received.' });
    return;
  }

  try {
    // Create a new JSZip instance to build a virtual zip file from the separate components.
    const zip = new JSZip();

    // Use Promise.all to asynchronously read all file parts and add them to the zip object.
    const fileReadPromises = files.map(file => {
      return file.arrayBuffer().then(buffer => {
        zip.file(file.name, buffer);
      });
    });
    await Promise.all(fileReadPromises);

    // Generate the complete zip file as an ArrayBuffer in memory.
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // shp.js's main function can directly parse the zip ArrayBuffer.
    const geojson = await shp(zipBuffer);

    let featureCollection = geojson;
    // shp.js may return an array of feature collections. We handle this by taking the first one.
    if (Array.isArray(geojson) && geojson.length > 0) {
      featureCollection = geojson[0];
    }

    if (!featureCollection || !featureCollection.features) {
      throw new Error("Could not parse a valid GeoJSON FeatureCollection from the provided files.");
    }
    
    // Extract the attribute column names from the properties of the first feature.
    let columns = [];
    if (featureCollection.features.length > 0) {
      columns = Object.keys(featureCollection.features[0].properties);
    }
    
    // Send the successful result back to the main thread.
    postMessage({
      status: 'success',
      geojson: featureCollection,
      columns: columns,
    });

  } catch (error) {
    // If any step fails, send a structured error message back.
    postMessage({
      status: 'error',
      message: error.message || 'An unknown error occurred while parsing the shapefile.',
    });
  }
};
