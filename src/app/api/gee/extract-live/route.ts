import { NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { initGEE } from '@/lib/geeCore';
import osmtogeojson from 'osmtogeojson';

// FIX 1: Node.js SDK requires positional arguments (format, selectors, filename, callback)
const getDownloadUrlAsync = (featureCollection: any, filename: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    featureCollection.getDownloadURL(
      'geojson', // format
      null,        // selectors (null means all properties)
      filename,  // filename
      (url: string, err: string) => {
        if (err) reject(new Error(err));
        else resolve(url);
      }
    );
  });
};

export async function POST(req: Request) {
  try {
    await initGEE();

    const { bbox, type } = await req.json();
    if (!bbox || bbox.length !== 4) {
      return NextResponse.json({ error: "Invalid bounding box" }, { status: 400 });
    }

    const [w, s, e, n] = bbox;
    const currentViewROI = ee.Geometry.Rectangle([w, s, e, n]);

    // --- HANDLE BUILDINGS (Fast, Native GEE) ---
    if (type === 'buildings') {
      const buildings = ee.FeatureCollection('GOOGLE/Research/open-buildings/v3/polygons')
        .filterBounds(currentViewROI)
        .filter(ee.Filter.gte('confidence', 0.75));
        
      const url = await getDownloadUrlAsync(buildings, 'Live_Buildings');
      return NextResponse.json({ success: true, url });
    }

    // --- HANDLE ROADS (OSM Overpass API) ---
    // FIX 2: Bypassing the missing BigQuery Node.js function using native OSM
    if (type === 'roads') {
      // Overpass expects bounding box as: [South, West, North, East]
      const overpassBbox = `${s},${w},${n},${e}`;
      const query = `
        [out:json][timeout:30];
        (way["highway"](${overpassBbox}););
        out body;
        >;
        out skel qt;
      `;

      const osmResponse = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });

      if (!osmResponse.ok) throw new Error("Failed to fetch roads from OSM");
      
      const osmData = await osmResponse.json();
      const roadGeoJson = osmtogeojson(osmData);

      // Return the raw GeoJSON directly to the frontend
      return NextResponse.json({ success: true, geoJson: roadGeoJson });
    }

    return NextResponse.json({ error: "Invalid type specified." }, { status: 400 });

  } catch (error: any) {
    console.error("Live Extraction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
