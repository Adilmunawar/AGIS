import ee from '@google/earthengine';

// Prevent Next.js from initializing Earth Engine twice during Hot Reloads
let isInitialized = false;

// 1. Authenticate and Initialize GEE using the Base64 Key
export const initGEE = async (): Promise<void> => {
  if (isInitialized) return Promise.resolve();

  return new Promise((resolve, reject) => {
    try {
      // Grab the Base64 string from your environment
      const base64Key = process.env.EE_BASE64_KEY;
      
      if (!base64Key) {
        throw new Error("EE_BASE64_KEY is missing from your .env.local file! The AI Engine cannot boot without credentials.");
      }

      // Decode the Base64 string back into a standard JSON object natively in memory
      const decodedString = Buffer.from(base64Key, 'base64').toString('utf-8');
      const credentials = JSON.parse(decodedString);

      console.log("🔐 Authenticating with Google Earth Engine Base64 Key...");

      ee.data.authenticateViaPrivateKey(credentials, () => {
        ee.initialize(null, null, () => {
          isInitialized = true;
          console.log("✅ Earth Engine Initialized Successfully!");
          resolve();
        }, (err: any) => {
          console.error("❌ GEE Init Error:", err);
          reject(err);
        });
      }, (err: any) => {
        console.error("❌ GEE Auth Error:", err);
        reject(err);
      });
    } catch (error) {
      console.error("❌ Base64 Decoding or Auth Failed:", error);
      reject(error);
    }
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
  const ndre = s2_live.normalizedDifference(['B5', 'B4']).rename('NDRE');
  const ndwi = s2_live.normalizedDifference(['B3', 'B8']).rename('NDWI');
  
  // FIX: This now exactly matches the Python script by not renaming the band.
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

// New Anomaly Detection Logic
const detectAnomalies = (timeline: any[]) => {
  if (timeline.length < 3) return [];

  const events: { date: string; type: string; description: string }[] = [];
  let maxNdvi = -1;
  let maxNdviDate = '';
  
  // Find Peak Health
  timeline.forEach(point => {
    if (point.ndvi > maxNdvi) {
      maxNdvi = point.ndvi;
      maxNdviDate = point.date;
    }
  });
  if (maxNdviDate) {
    events.push({ date: maxNdviDate, type: 'peak', description: `Peak crop health detected (NDVI: ${maxNdvi.toFixed(2)})` });
  }

  // Find Start of Season
  const firstHalf = timeline.slice(0, Math.floor(timeline.length / 2));
  const minNdviFirstHalf = Math.min(...firstHalf.map(p => p.ndvi || 1));
  const startThreshold = minNdviFirstHalf + 0.15;
  
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i].ndvi > startThreshold && timeline[i-1].ndvi < startThreshold) {
      events.push({ date: timeline[i].date, type: 'start', description: `Start of growing season detected (NDVI crossed ${startThreshold.toFixed(2)})` });
      break; 
    }
  }

  // Find Stress & Burn Events
  for (let i = 1; i < timeline.length; i++) {
    const ndviDrop = timeline[i-1].ndvi - timeline[i].ndvi;
    if (ndviDrop > 0.18) { // Significant drop
      events.push({ date: timeline[i].date, type: 'stress', description: `Potential stress event detected (NDVI drop of ${ndviDrop.toFixed(2)})` });
    }
    if (timeline[i].nbr > 0.2) { // NBR threshold for burn scars
       events.push({ date: timeline[i].date, type: 'burn', description: `Potential burn anomaly detected (NBR: ${timeline[i].nbr.toFixed(2)})` });
    }
  }

  // Deduplicate events by date
  const uniqueEvents = Array.from(new Map(events.map(event => [event.date, event])).values());
  return uniqueEvents;
};


export const getHistoricalTimeline = async (
  geometry: any, 
  months: number = 6,
  compare: boolean = false
) => {
  await initGEE();
  
  const now = ee.Date(new Date());
  const startDate = now.advance(-months, 'month');

  // Helper to fetch data for a specific window
  const fetchRange = (sDate: ee.Date, eDate: ee.Date): Promise<ee.FeatureCollection> => {
    const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(geometry)
      .filterDate(sDate, eDate)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .map((img: ee.Image) => {
        const ndvi = img.normalizedDifference(['B8', 'B4']).rename('ndvi');
        const ndmi = img.normalizedDifference(['B8', 'B11']).rename('ndmi');
        const ndre = img.normalizedDifference(['B5', 'B4']).rename('ndre');
        const nbr = img.normalizedDifference(['B8A', 'B12']).rename('nbr');
        
        return img.addBands([ndvi, ndmi, ndre, nbr])
          .set('date', img.date().format('YYYY-MM-dd'));
      });

    return new Promise((resolve, reject) => {
      collection.map((img: ee.Image) => {
        const stats = img.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: geometry,
          scale: 10,
          maxPixels: 1e9,
        });
        return ee.Feature(null, stats).set('date', img.get('date'));
      }).evaluate((result: any, error: any) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  };

  const currentData = await fetchRange(startDate, now);
  const timeline = currentData.features.map((f: any) => f.properties);
  
  let ghostTimeline: any[] | null = null;
  if (compare) {
    const ghostStart = startDate.advance(-1, 'year');
    const ghostEnd = now.advance(-1, 'year');
    const ghostData = await fetchRange(ghostStart, ghostEnd);
    ghostTimeline = ghostData.features.map((f: any) => f.properties);
  }

  const events = detectAnomalies(timeline);

  return { timeline, ghostTimeline, events };
};