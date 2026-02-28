import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow Vercel more time for the Vision API to process

export async function POST(req: Request) {
  try {
    const { imageBase64, bounds, apiKey } = await req.json();
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 401 });

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 🔥 THE FIX: Switched to the gemini-1.5-flash model for fast multimodal analysis.
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
            responseMimeType: "application/json", // Forces the model to only return valid JSON
        }
    });

    // THE MASTER SPATIAL PROMPT FOR BUILDINGS AND ROADS
    const prompt = `
    You are an expert Cadastral GIS AI. Extract precise property boundaries, building footprints, and roads from this satellite image.
    
    INSTRUCTIONS:
    1. Identify distinct buildings/properties AND visible roads/paths.
    2. Trace shapes using vertices. Use 4-8 vertices for buildings. Use 2-10 vertices for roads.
    3. Output coordinates as a normalized relative spatial grid: [0.000, 0.000] is Top-Left, [1.000, 1.000] is Bottom-Right.
    
    OUTPUT FORMAT MUST MATCH THIS EXACT JSON SCHEMA:
    {
      "features": [
        {
          "entity_type": "building",
          "vertices": [ [0.150, 0.200], [0.150, 0.350], [0.250, 0.350], [0.250, 0.200] ]
        },
        {
          "entity_type": "road",
          "vertices": [ [0.400, 0.100], [0.450, 0.500], [0.500, 0.900] ]
        }
      ]
    }
    `;

    const imagePart = { 
        inlineData: { 
            data: imageBase64.split(',')[1], 
            mimeType: "image/jpeg" 
        } 
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // Strip markdown if the model accidentally includes it despite JSON mode
    const cleanJsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const detectedData = JSON.parse(cleanJsonStr);

    // TRANSLATION LAYER: Relative grid [0-1] to Real-World GPS GeoJSON
    const geoJsonFeatures = detectedData.features.map((item: any) => {
      
      const realWorldCoords = item.vertices.map((vertex: [number, number]) => {
        const [relX, relY] = vertex;
        // relX (0 to 1) maps to West to East (Longitude)
        const lng = bounds.west + relX * (bounds.east - bounds.west);
        // relY (0 to 1) maps to North to South (Latitude). Subtracted because North is higher.
        const lat = bounds.north - relY * (bounds.north - bounds.south);
        return [lng, lat];
      });

      const isBuilding = item.entity_type === "building";

      // If it's a building (Polygon), we MUST close the loop for valid GeoJSON
      if (isBuilding && realWorldCoords.length > 2) {
        const first = realWorldCoords[0];
        const last = realWorldCoords[realWorldCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          realWorldCoords.push([...first]);
        }
      }

      // Construct the proper GeoJSON Feature
      return {
        type: "Feature",
        properties: { 
            source: "AGIS Nano Vision (Gemini 1.5 Flash)",
            type: item.entity_type 
        },
        geometry: { 
            type: isBuilding ? "Polygon" : "LineString", 
            coordinates: isBuilding ? [realWorldCoords] : realWorldCoords 
        }
      };
    });

    return NextResponse.json({ type: "FeatureCollection", features: geoJsonFeatures });

  } catch (error: any) {
    console.error("Gemini Digitization Error:", error);
    let errorMessage = "An unknown error occurred during Nano Vision processing.";
    if (error.message?.includes('API key not valid')) {
        errorMessage = "Invalid Gemini API Key. Please check the key in Server Config.";
    } else if (error.message?.includes('400 Bad Request')) {
        errorMessage = "The model could not process the image. Try a different area or zoom level.";
    } else if (error instanceof SyntaxError) {
        errorMessage = "The AI model returned an invalid spatial structure.";
    }
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
  }
}
