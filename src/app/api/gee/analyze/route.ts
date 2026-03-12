import { NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { initGEE, getZaraatDostLayers } from '@/lib/geeCore';

export async function POST(req: Request) {
  try {
    const { geometry } = await req.json();
    if (!geometry) return NextResponse.json({ error: "No geometry" }, { status: 400 });

    await initGEE();
    const geom = ee.Geometry(geometry);
    const layers = getZaraatDostLayers();

    // Promises for EE math evaluations
    const evaluateEE = (eeObject: any): Promise<any> => new Promise((resolve, reject) => {
      eeObject.evaluate((val: any, err: any) => err ? reject(err) : resolve(val));
    });

    const area_sqm = geom.area();
    const indices_image = ee.Image([layers.ndvi, layers.ndmi, layers.ndre, layers.nbr]);
    
    const averagesReducer = indices_image.reduceRegion({
      reducer: ee.Reducer.mean(), geometry: geom, scale: 10, maxPixels: 1e9
    });
    
    const cropModeReducer = layers.classification.reduceRegion({
      reducer: ee.Reducer.mode(), geometry: geom, scale: 10, maxPixels: 1e9
    });

    // Run evaluations asynchronously
    const [areaVal, avgVals, cropVal] = await Promise.all([
      evaluateEE(area_sqm),
      evaluateEE(averagesReducer),
      evaluateEE(cropModeReducer)
    ]);

    const areaAcres = areaVal * 0.000247105;
    const cropClass = cropVal['CROP_CLASS'] || 0;
    const cropNames: Record<number, string> = { 0: 'Unknown', 1: 'Ploughed / Bare Dirt', 2: 'Wheat / Cotton (Dry)', 3: 'Sugarcane / Rice (Wet)', 4: 'Trees / Urban' };

    return NextResponse.json({
      status: "success",
      scorecard: {
        area_acres: parseFloat(areaAcres.toFixed(2)),
        primary_crop: cropNames[cropClass] || "Unknown",
        avg_ndvi: parseFloat((avgVals['NDVI'] || 0).toFixed(2)),
        avg_ndmi: parseFloat((avgVals['NDMI'] || 0).toFixed(2)),
        avg_ndre: parseFloat((avgVals['NDRE'] || 0).toFixed(2)),
        burn_damage: parseFloat((avgVals['NBR'] || 0).toFixed(2))
      }
    });

  } catch (error: any) {
    console.error("GEE Analysis Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
