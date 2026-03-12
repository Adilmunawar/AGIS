import { NextResponse } from 'next/server';
import { initGEE, getZaraatDostLayers, getMapUrl } from '@/lib/geeCore';

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
    for (const key of Object.keys(visParams)) {
      // @ts-ignore
      if (layers[key]) {
          // @ts-ignore
          urls[key] = await getMapUrl(layers[key], visParams[key]);
      }
    }

    return NextResponse.json({ status: 'success', tiles: urls });
  } catch (error: any) {
    console.error("GEE Tile Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
