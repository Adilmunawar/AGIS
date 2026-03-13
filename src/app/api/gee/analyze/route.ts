import { NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { initGEE, getZaraatDostLayers, getHistoricalTimeline } from '@/lib/geeCore';

export async function POST(req: Request) {
  try {
    const { geometry, range = 6, compare = false } = await req.json();
    if (!geometry) return NextResponse.json({ error: "No geometry provided in the request body." }, { status: 400 });

    await initGEE();
    const geom = ee.Geometry(geometry);

    // --- Create a separate promise for the scorecard ---
    const scorecardPromise = new Promise(async (resolve, reject) => {
      try {
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

        resolve({
          area_acres: parseFloat(areaAcres.toFixed(2)),
          primary_crop: cropNames[cropClass] || "Unknown",
          avg_ndvi: parseFloat((avgVals['NDVI'] || 0).toFixed(2)),
          avg_ndmi: parseFloat((avgVals['NDMI'] || 0).toFixed(2)),
          avg_ndre: parseFloat((avgVals['NDRE'] || 0).toFixed(2)),
          burn_damage: parseFloat((avgVals['NBR'] || 0).toFixed(2))
        });
      } catch (error) {
        reject(error);
      }
    });

    // --- Create a separate promise for the timeline ---
    const timelinePromise = getHistoricalTimeline(geom, range, compare);

    // --- Run both in parallel ---
    const [scorecardResult, timelineResult] = await Promise.all([scorecardPromise, timelinePromise]);

    return NextResponse.json({
      status: "success",
      scorecard: scorecardResult,
      timeline: timelineResult.timeline,
      ghostTimeline: timelineResult.ghostTimeline,
      metadata: {
        rangeRequested: `${range} months`,
        compareEnabled: compare,
        dataPoints: timelineResult.timeline.length
      }
    });

  } catch (error: any) {
    console.error("GEE Analysis Error:", error.message || error);
    return NextResponse.json({ error: `GEE analysis failed on the server: ${error.message}` }, { status: 500 });
  }
}
