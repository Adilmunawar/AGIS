import { NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { initGEE } from '@/lib/geeCore';

// Helper to wrap GEE callback into a modern Promise
const getDownloadUrlAsync = (featureCollection: any, filename: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    featureCollection.getDownloadURL({ format: 'GEO_JSON', filename }, (url: string, err: string) => {
      if (err) reject(new Error(err));
      else resolve(url);
    });
  });
};

export async function POST(req: Request) {
  try {
    await initGEE();

    // The frontend now passes a 'type' parameter
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

    // --- HANDLE ROADS (Slower, BigQuery) ---
    if (type === 'roads') {
      const polygonString = `POLYGON((${w} ${s}, ${e} ${s}, ${e} ${n}, ${w} ${n}, ${w} ${s}))`;
      const roadsQuery = `
        SELECT geometry, id, class 
        FROM \`bigquery-public-data.overture_maps.segment\` 
        WHERE ST_INTERSECTS(geometry, ST_GEOGFROMTEXT('${polygonString}'))
      `;
      const roads = ee.FeatureCollection.fromBigQuery({
        query: roadsQuery,
        geometryColumn: 'geometry'
      });
      
      const url = await getDownloadUrlAsync(roads, 'Live_Roads');
      return NextResponse.json({ success: true, url });
    }

    return NextResponse.json({ error: "Invalid type specified." }, { status: 400 });

  } catch (error: any) {
    console.error("Live Extraction Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
