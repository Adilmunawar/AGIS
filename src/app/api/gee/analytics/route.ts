import { NextResponse } from 'next/server';
import ee from '@google/earthengine';
import { initGEE, getMapUrl } from '@/lib/geeCore';

// Helper to promisify ee.data.getMapId
const evaluateEE = (eeObject: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      eeObject.evaluate((val: any, err: any) => err ? reject(err) : resolve(val));
    });
};

// Re-usable classification function based on improved Python script
const classifyLandcover = (image: ee.Image) => {
    const ndvi = image.normalizedDifference(['B8', 'B4']);
    const ndbi = image.normalizedDifference(['B11', 'B8']);
    const mndwi = image.normalizedDifference(['B3', 'B11']);
    const nir = image.select('B8');
    const brightness = image.select(['B2', 'B3', 'B4']).reduce(ee.Reducer.sum());

    const is_water = mndwi.gt(0.0).And(nir.lt(2000));
    const is_veg = ndvi.gt(0.3).And(ndbi.lt(0.0)).And(is_water.Not());
    
    const raw_trees = is_veg.And(brightness.lt(2500));
    const raw_grass = is_veg.And(brightness.gte(2500));
    const raw_built = is_water.Not().And(is_veg.Not());
    
    // Noise Removal
    const clean_built_up = raw_built.focal_mode(1, 'square', 'pixels');
    const final_water = is_water.focal_mode(1, 'square', 'pixels');
    const final_trees = raw_trees.focal_mode(1, 'square', 'pixels').And(clean_built_up.Not());
    const final_grass = raw_grass.focal_mode(1, 'square', 'pixels').And(clean_built_up.Not()).And(final_trees.Not());
    
    // 0=Built, 1=Water, 2=Grass, 3=Trees
    // This chain of .where() calls establishes a precedence: Trees > Grass > Water > Built-up (default)
    return ee.Image(0)
        .where(final_water, 1)
        .where(final_grass, 2)
        .where(final_trees, 3)
        .rename('class');
};


export async function POST(req: Request) {
    try {
        await initGEE();
        const { lat, lng } = await req.json();
        if (!lat || !lng) {
            return NextResponse.json({ error: 'Latitude and Longitude are required.' }, { status: 400 });
        }

        const aoi = ee.Geometry.Point([lng, lat]).buffer(1000); // FIX: Radius changed to 1km to match Python script

        // --- Date Ranges ---
        const endDate = ee.Date(Date.now());
        const startDate = endDate.advance(-30, 'day');
        const pastEndDate = endDate.advance(-1, 'year');
        const pastStartDate = pastEndDate.advance(-30, 'day');

        // --- Image Collections ---
        const s2Current = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterDate(startDate, endDate).filterBounds(aoi).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).mosaic();
        const s2Past = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterDate(pastStartDate, pastEndDate).filterBounds(aoi).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 25)).mosaic();

        // --- Classifications ---
        const classifiedNow = classifyLandcover(s2Current).clip(aoi);
        
        // --- Change Detection ---
        const ndviNow = s2Current.normalizedDifference(['B8', 'B4']);
        const ndviPast = s2Past.normalizedDifference(['B8', 'B4']);
        const ndviChange = ndviNow.subtract(ndviPast).rename('ndvi_change');

        // --- Deforestation / Reforestation ---
        const classifiedPast = classifyLandcover(s2Past).clip(aoi);
        const treesNow = classifiedNow.eq(3);
        const treesPast = classifiedPast.eq(3);
        const deforestation = treesPast.and(treesNow.not()).rename('deforestation'); // Was tree, is not tree now
        const reforestation = treesNow.and(treesPast.not()).rename('reforestation'); // Was not tree, is tree now
        const forestChange = ee.Image(0).where(reforestation, 1).where(deforestation, 2).selfMask();

        // --- Advanced Indices ---
        const ndvi = s2Current.normalizedDifference(['B8', 'B4']).rename('ndvi');
        const ndwi = s2Current.normalizedDifference(['B3', 'B8']).rename('ndwi');
        // SAVI: (NIR - Red) / (NIR + Red + L) * (1 + L) with L=0.5
        const savi = s2Current.expression('(1.5 * (NIR - RED)) / (NIR + RED + 0.5)', { 'NIR': s2Current.select('B8'), 'RED': s2Current.select('B4') }).rename('savi');
        // EVI: 2.5 * ((NIR - Red) / (NIR + 6 * Red - 7.5 * Blue + 1))
        // FIX: Corrected parenthesis in expression
        const evi = s2Current.expression('2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', { 'NIR': s2Current.select('B8'), 'RED': s2Current.select('B4'), 'BLUE': s2Current.select('B2') }).rename('evi');
        
        // --- Vectorization ---
        const treeVectors = treesNow.selfMask().reduceToVectors({ geometry: aoi, scale: 10, geometryType: 'polygon', eightConnected: true, maxPixels: 1e9 });
        const vectorOutlines = ee.Image().byte().paint({ featureCollection: treeVectors, color: 1, width: 2 }).selfMask();
        
        // --- Statistics ---
        const areaImage = ee.Image.pixelArea().addBands(classifiedNow);
        const statsReducer = areaImage.reduceRegion({ reducer: ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }), geometry: aoi, scale: 10, maxPixels: 1e9 });
        const rawStats = await evaluateEE(statsReducer);
        const classMapping = ['builtUp', 'water', 'grass', 'trees'];
        const stats: { [key: string]: number } = { trees: 0, grass: 0, water: 0, builtUp: 0 };
        if (rawStats && rawStats.groups) {
            rawStats.groups.forEach((group: { class: number; sum: number }) => {
                const className = classMapping[group.class];
                if (className) {
                    stats[className] = parseFloat((group.sum * 0.000247105).toFixed(2));
                }
            });
        }

        // --- Tile Layer URL Generation ---
        const visParams = {
            classification: { min: 0, max: 3, palette: ['#FFFFFF', '#0000FF', '#7CFC00', '#006400'] },
            forestChange: { min: 1, max: 2, palette: ['#00FF00', '#FF0000'] },
            timeTravel: { min: -0.3, max: 0.3, palette: ['FF0000', 'FFFFFF', '00FF00'] },
            vectorOutlines: { palette: ['#FFD700'] },
            ndvi: { min: -0.2, max: 0.8, palette: ['red', 'yellow', 'green'] },
            ndwi: { min: -0.5, max: 0.5, palette: ['brown', 'white', 'blue'] },
            savi: { min: -0.2, max: 0.8, palette: ['red', 'yellow', 'green'] },
            evi: { min: -0.2, max: 1, palette: ['red', 'yellow', 'green'] },
        };

        const tileUrls = {
            classification: await getMapUrl(classifiedNow, visParams.classification),
            deforestation: await getMapUrl(forestChange, visParams.forestChange),
            timeTravel: await getMapUrl(ndviChange.clip(aoi), visParams.timeTravel),
            vectorOutlines: await getMapUrl(vectorOutlines, visParams.vectorOutlines),
            ndvi: await getMapUrl(ndvi.clip(aoi), visParams.ndvi),
            ndwi: await getMapUrl(ndwi.clip(aoi), visParams.ndwi),
            savi: await getMapUrl(savi.clip(aoi), visParams.savi),
            evi: await getMapUrl(evi.clip(aoi), visParams.evi),
        };

        return NextResponse.json({ stats, tileUrls });

    } catch (error: any) {
        console.error("GEE Analytics Error:", error);
        return NextResponse.json({ error: `GEE analysis failed: ${error.message}` }, { status: 500 });
    }
}
