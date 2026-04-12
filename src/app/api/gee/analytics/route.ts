import { NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { initGEE, getMapUrl } from '@/lib/geeCore';

// Helper to promisify ee.data.getMapId
const evaluateEE = (eeObject: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      eeObject.evaluate((val: any, err: any) => err ? reject(err) : resolve(val));
    });
};

export async function POST(req: Request) {
    try {
        await initGEE();
        const { lat, lng } = await req.json();
        if (!lat || !lng) {
            return NextResponse.json({ error: 'Latitude and Longitude are required.' }, { status: 400 });
        }

        const aoi = ee.Geometry.Point([lng, lat]).buffer(1000); // 1km radius

        const endDate = ee.Date(Date.now());
        const startDate = endDate.advance(-30, 'day');

        const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterDate(startDate, endDate)
            .filterBounds(aoi)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            .median();

        // --- Multi-spectral Indices (Advanced Logic) ---
        const ndvi = s2.normalizedDifference(['B8', 'B4']);
        const ndbi = s2.normalizedDifference(['B11', 'B8']);
        const mndwi = s2.normalizedDifference(['B3', 'B11']);
        const brightness = s2.select('B2').add(s2.select('B3')).add(s2.select('B4')).rename('brightness');

        // --- Classification Logic (Pure Physics Model from Python Script) ---
        const isWater = mndwi.gt(0.0).and(s2.select('B8').lt(2000));
        const isBuiltUp = ndbi.gt(0.0).and(isWater.not());
        const isVeg = ndvi.gt(0.3).and(isWater.not()).and(isBuiltUp.not());
        
        const isTree = isVeg.and(brightness.lt(2500));
        const isGrass = isVeg.and(brightness.gte(2500));
        
        // Final classified image with precedence
        let classified = ee.Image(4) // 4 = Bare/Other
            .where(isWater, 3) // 3 = Water
            .where(isBuiltUp, 2) // 2 = Built-up
            .where(isGrass, 1) // 1 = Grass
            .where(isTree, 0) // 0 = Trees
            .rename('class');
        
        // Remove salt-and-pepper noise
        classified = classified.focal_mode({radius: 1.5, kernelType: 'circle', units: 'pixels'});
        
        // --- Statistics Calculation ---
        const areaImage = ee.Image.pixelArea().addBands(classified);
        const statsReducer = areaImage.reduceRegion({
            reducer: ee.Reducer.sum().group({
                groupField: 1, // 'class' band index
                groupName: 'class',
            }),
            geometry: aoi,
            scale: 10,
            maxPixels: 1e9,
        });

        const rawStats = await evaluateEE(statsReducer);
        const classMapping = ['trees', 'grass', 'builtUp', 'water', 'bare'];
        const stats = { trees: 0, grass: 0, water: 0, builtUp: 0, bare: 0 };
        
        if (rawStats && rawStats.groups) {
            rawStats.groups.forEach((group: { class: number; sum: number }) => {
                const className = classMapping[group.class];
                if (className) {
                    const areaInAcres = group.sum * 0.000247105;
                    // @ts-ignore
                    stats[className] = parseFloat(areaInAcres.toFixed(2));
                }
            });
        }
        
        // --- Tile Layer URL Generation ---
        const classVisParams = { min: 0, max: 4, palette: ['#006400', '#32CD32', '#808080', '#4682B4', '#D2B48C'] };
        const classifiedUrl = await getMapUrl(classified, classVisParams);

        // --- Time Travel (1-Year NDVI Change) Layer ---
        const thenStartDate = startDate.advance(-1, 'year');
        const thenEndDate = endDate.advance(-1, 'year');
        
        const s2Then = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterDate(thenStartDate, thenEndDate)
            .filterBounds(aoi)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 25)) // Looser filter for historical data
            .median();

        const ndviThen = s2Then.normalizedDifference(['B8', 'B4']);
        const ndviChange = ndvi.subtract(ndviThen);
        const ndviChangeVis = { min: -0.3, max: 0.3, palette: ['#d73027', '#ffffbf', '#1a9850'] };
        const ndviChangeUrl = await getMapUrl(ndviChange, ndviChangeVis);

        return NextResponse.json({
            stats,
            tileUrls: {
                classified: classifiedUrl,
                ndviChange: ndviChangeUrl
            }
        });

    } catch (error: any) {
        console.error("GEE Analytics Error:", error);
        return NextResponse.json({ error: `GEE analysis failed: ${error.message}` }, { status: 500 });
    }
}
