/// <reference lib="webworker" />

import { open } from 'shapefile';

// Define the message format we expect
interface WorkerData {
  files: File[];
  fileId?: string;
  layer?: string;
}

// Simple file reader utility
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

self.onmessage = async (event: MessageEvent<WorkerData>) => {
  const { files, fileId, layer } = event.data;

  try {
    if (!files || files.length < 2) {
      throw new Error('Shapefile requires at least a .shp and .dbf file.');
    }
    
    // Find the primary .shp and .dbf files
    const shpFile = files.find(f => f.name.toLowerCase().endsWith('.shp'));
    const dbfFile = files.find(f => f.name.toLowerCase().endsWith('.dbf'));

    if (!shpFile || !dbfFile) {
      throw new Error('A .shp and .dbf file are required for processing.');
    }

    // Read files into ArrayBuffers
    const shpBuffer = await readFileAsArrayBuffer(shpFile);
    const dbfBuffer = await readFileAsArrayBuffer(dbfFile);
    
    const features: any[] = [];
    
    // Use the 'shapefile' library to read records one by one (streaming)
    const source = await open(shpBuffer, dbfBuffer);
    while (true) {
      const result = await source.read();
      if (result.done) break;
      features.push(result.value);
    }

    const geojson = {
      type: 'FeatureCollection' as const,
      features: features,
    };
    
    // Send success message back to the main thread
    self.postMessage({
      status: 'success',
      geojson,
      fileId, // Pass back identifiers
      layer,
    });

  } catch (error: any) {
    // Send error message back
    self.postMessage({
      status: 'error',
      error: error.message || 'An unknown error occurred in the shapefile worker.',
      fileId,
      layer,
    });
  }
};
