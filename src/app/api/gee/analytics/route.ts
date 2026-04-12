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
            .mosaic();

        // --- Multi-spectral Indices (Advanced Logic from Python Script) ---
        const ndvi = s2.normalizedDifference(['B8', 'B4']);
        const ndbi = s2.normalizedDifference(['B11', 'B8']);
        const mndwi = s2.normalizedDifference(['B3', 'B11']);
        const brightness = s2.select(['B2', 'B3', 'B4']).reduce(ee.Reducer.sum());
        const nir = s2.select('B8');

        // --- Strict Classification Logic ---
        const is_water = mndwi.gt(0.0).And(nir.lt(2000));
        const is_veg = ndvi.gt(0.3).And(ndbi.lt(0.0)).And(is_water.Not());
        
        const BRIGHTNESS_THRESHOLD = 2500;
        const raw_trees = is_veg.And(brightness.lt(BRIGHTNESS_THRESHOLD));
        const raw_grass = is_veg.And(brightness.gte(BRIGHTNESS_THRESHOLD));
        const raw_built = is_water.Not().And(is_veg.Not());
        
        // --- Noise Removal & Final Classification ---
        const clean_built_up = raw_built.focal_mode(1, 'square', 'pixels');
        const final_water = is_water.focal_mode(1, 'square', 'pixels');
        
        const final_trees = raw_trees.focal_mode(1, 'square', 'pixels').And(clean_built_up.Not());
        const final_grass = raw_grass.focal_mode(1, 'square', 'pixels').And(clean_built_up.Not()).And(final_trees.Not());
        
        // 0=Built, 1=Water, 2=Grass, 3=Trees
        const classified = ee.Image(0)
            .where(final_water, 1)
            .where(final_grass, 2)
            .where(final_trees, 3)
            .clip(aoi)
            .rename('class');
        
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
        const classMapping = ['builtUp', 'water', 'grass', 'trees'];
        const stats: { [key: string]: number } = { trees: 0, grass: 0, water: 0, builtUp: 0 };
        
        if (rawStats && rawStats.groups) {
            rawStats.groups.forEach((group: { class: number; sum: number }) => {
                const className = classMapping[group.class];
                if (className) {
                    const areaInAcres = group.sum * 0.000247105;
                    stats[className] = parseFloat(areaInAcres.toFixed(2));
                }
            });
        }
        
        // --- Vectorization of Trees ---
        const tree_vectors = final_trees.selfMask().clip(aoi).reduceToVectors({
            geometry: aoi, scale: 10, geometryType: 'polygon', eightConnected: true, maxPixels: 1e8,
        });
        const vector_outlines = ee.Image().byte().paint({featureCollection: tree_vectors, color: 1, width: 2});

        // --- Tile Layer URL Generation ---
        const classVisParams = { min: 0, max: 3, palette: ['#FFFFFF', '#0000FF', '#7CFC00', '#006400'] };
        const classifiedUrl = await getMapUrl(classified, classVisParams);

        const vectorVisParams = { palette: ['#FFD700'] };
        const vectorOutlinesUrl = await getMapUrl(vector_outlines.selfMask(), vectorVisParams);

        // --- Time Travel (1-Year NDVI Change) Layer ---
        const thenStartDate = startDate.advance(-1, 'year');
        const thenEndDate = endDate.advance(-1, 'year');
        
        const s2Then = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterDate(thenStartDate, thenEndDate)
            .filterBounds(aoi)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 25))
            .median();

        const ndviThen = s2Then.normalizedDifference(['B8', 'B4']);
        const ndviChange = ndvi.subtract(ndviThen);
        const ndviChangeVis = { min: -0.3, max: 0.3, palette: ['#FF0000', '#FFFFFF', '#00FF00'] };
        const ndviChangeUrl = await getMapUrl(ndviChange, ndviChangeVis);

        return NextResponse.json({
            stats,
            tileUrls: {
                classified: classifiedUrl,
                ndviChange: ndviChangeUrl,
                vectorOutlines: vectorOutlinesUrl,
            }
        });

    } catch (error: any) {
        console.error("GEE Analytics Error:", error);
        return NextResponse.json({ error: `GEE analysis failed: ${error.message}` }, { status: 500 });
    }
}
