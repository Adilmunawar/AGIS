import { NextResponse } from 'next/server';
import { initGEE, getZaraatDostLayers, getMapUrl } from '@/lib/geeCore';
import ee from '@google/earthengine';

export async function GET() {
  try {
    await initGEE();
    const layers = getZaraatDostLayers();

    const visParams: Record<string, any> = {
      's2_true_color': { min: 0, max: 3000, gamma: 1.4 },
      'classification': { min: 0, max: 4, palette: ['A8A8A8', 'D2B48C', 'FCD34D', '22C55E', '5C4033'] },
      'ndvi': { min: 0.1, max: 0.8, palette: ['ff0000', 'ffff00', '00ff00', '004400'] },
      'ndmi': { min: -0.2, max: 0.4, palette: ['ff0000', 'ffaa00', '00ffff', '0000ff'] },
      'ndre': { min: 0.1, max: 0.6, palette: ['ff4400', 'ffff00', '99ff00', '006600'] },
      'bsi': { min: 0.05, max: 0.3, palette: ['000000', '8B4513', 'FFDEAD'] },
      'nbr': { min: -0.5, max: 0.5, palette: ['000000', 'ff0000', 'ffff00'] },
      'ndci': { min: -0.1, max: 0.4, palette: ['0000ff', '00ff00', 'ff0000'] },
      'ndsi': { min: 0.0, max: 1.0, palette: ['000000', 'ffffff'] }
    };

    const urls: Record<string, string> = {};
    const promises = Object.keys(visParams).map(async (key) => {
      // @ts-ignore
      if (layers[key]) {
          try {
            // @ts-ignore
            urls[key] = await getMapUrl(layers[key], visParams[key]);
          } catch(e) {
            console.warn(`Could not generate tile for global layer ${key}`);
          }
      }
    });

    await Promise.all(promises);

    return NextResponse.json({ status: 'success', tiles: urls });
  } catch (error: any) {
    console.error("GEE Tile Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initGEE();
    const { assetId } = await req.json();
    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    const image = ee.Image(assetId);

    // Standard visualizations for Sentinel-2 or Landsat-like assets
    const visConfigs = {
      trueColor: { name: 'True Color (B4/B3/B2)', params: { bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4 }},
      falseColor: { name: 'Color Infrared (B8/B4/B3)', params: { bands: ['B8', 'B4', 'B3'], min: 0, max: 4000, gamma: 1.4 }},
      swir: { name: 'SWIR (B12/B8A/B4)', params: { bands: ['B12', 'B8A', 'B4'], min: 0, max: 5000, gamma: 1.4 }},
      agriculture: { name: 'Agriculture (B11/B8/B2)', params: { bands: ['B11', 'B8', 'B2'], min: 0, max: 5000, gamma: 1.4 }},
    };

    const urls: Record<string, {name: string, url: string}> = {};

    const promises = Object.entries(visConfigs).map(async ([key, config]) => {
      try {
        const url = await getMapUrl(image, config.params);
        urls[key] = { name: config.name, url };
      } catch (e) {
        console.warn(`Could not generate tile URL for vis '${key}' on asset '${assetId}'. This may be because the image does not contain the required bands.`);
      }
    });

    await Promise.all(promises);

    if (Object.keys(urls).length === 0) {
        throw new Error("Could not generate any visualizations. Please ensure the asset is a valid image with standard bands (e.g., B4, B3, B2).");
    }

    return NextResponse.json({ status: 'success', tiles: urls });

  } catch (error: any) {
    console.error("GEE Asset Tile Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
