import ee from '@google/earthengine';

// 🌟 THE FIX: Prevent Next.js from initializing Earth Engine twice during Hot Reloads!
let isInitialized = false;

// 1. Authenticate and Initialize GEE (Wrapped in a Promise)
export const initGEE = async (): Promise<void> => {
  if (isInitialized) return Promise.resolve(); // Skip if already running

  return new Promise((resolve, reject) => {
    // 🌟 THE FIX: Bulletproof Private Key parsing. 
    // Next.js sometimes parses \n automatically, sometimes it doesn't. This handles both safely.
    const rawKey = process.env.EE_PRIVATE_KEY || '';
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

    const credentials = {
      client_email: process.env.EE_CLIENT_EMAIL,
      private_key: privateKey,
    };

    if (!credentials.client_email || !credentials.private_key) {
        return reject("Service account credentials not found in environment variables.");
    }

    ee.data.authenticateViaPrivateKey(credentials, () => {
      ee.initialize(null, null, () => {
        isInitialized = true;
        resolve();
      }, (err: any) => reject(err));
    }, (err: any) => reject(err));
  });
};

// 2. The Core Zaraat Dost AI Math (Translated from Python to JS)
export const getZaraatDostLayers = () => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDateObj = new Date();
  startDateObj.setDate(today.getDate() - 60);
  const startDate = startDateObj.toISOString().split('T')[0];

  const s2_live = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15))
    .median();

  const ndvi = s2_live.normalizedDifference(['B8', 'B4']).rename('NDVI');
  const ndmi = s2_live.normalizedDifference(['B8', 'B11']).rename('NDMI');
  const ndre = s2_live.normalizedDifference(['B8', 'B5']).rename('NDRE');
  const ndwi = s2_live.normalizedDifference(['B3', 'B8']).rename('NDWI');
  
  const bsi = s2_live.expression('((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2) + 0.00001)', {
    'B11': s2_live.select('B11'), 'B4': s2_live.select('B4'),
    'B8': s2_live.select('B8'),   'B2': s2_live.select('B2')
  }).rename('BSI');

  const nbr = s2_live.normalizedDifference(['B8A', 'B12']).rename('NBR');
  const ndci = s2_live.normalizedDifference(['B5', 'B4']).rename('NDCI');
  const ndsi = s2_live.normalizedDifference(['B3', 'B11']).rename('NDSI');

  const worldcover = ee.ImageCollection("ESA/WorldCover/v200").first();
  const is_non_crop = worldcover.eq(10).or(worldcover.eq(50)).or(worldcover.eq(80));

  const classification = ee.Image(0)
    .where(bsi.gt(0.1), 1)
    .where(ndvi.gt(0.25).and(ndmi.lt(0.15)), 2)
    .where(ndvi.gt(0.35).and(ndmi.gt(0.15)), 3)
    .where(is_non_crop, 4).rename('CROP_CLASS');

  return {
    s2_true_color: s2_live.select(['B4', 'B3', 'B2']),
    classification, ndvi, ndmi, ndre, ndwi, bsi, nbr,
    ndci: ndci.updateMask(ndwi.gt(0)),
    ndsi: ndsi.updateMask(ndsi.gt(0.4))
  };
};

// Helper to get Map URL securely
export const getMapUrl = (image: any, visParams: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    image.getMap(visParams, (map: any, err: any) => {
      if (err) reject(err);
      else resolve(map.urlFormat);
    });
  });
};
