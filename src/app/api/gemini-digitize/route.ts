
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { imageBase64, bounds, apiKey } = await req.json();
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 401 });

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using Gemini 2.5 Flash as requested
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json", 
            temperature: 0.1, // LOW temperature so it doesn't "hallucinate" random points
        }
    });

    // 🔥 THE MAX-PRECISION SPATIAL PROMPT
    const prompt = `
    You are an expert Cadastral GIS AI. Your job is to extract precise building footprints and roads from this satellite image.
    
    CRITICAL RULES:
    1. DO NOT draw generic square bounding boxes. 
    2. You MUST trace the actual architectural outline/corners of the building's roof. If a building is L-shaped, output 6 vertices. If it is complex, output up to 12 vertices.
    3. Roads must be traced along their centerlines with 3-15 vertices.
    4. Output coordinates as a normalized relative spatial grid: [0.0000, 0.0000] is Top-Left, [1.0000, 1.0000] is Bottom-Right. Use 4 decimal places for precision.
    
    OUTPUT FORMAT MUST MATCH THIS EXACT JSON SCHEMA:
    {
      "features": [
        {
          "entity_type": "building",
          "vertices": [ [0.1502, 0.2001], [0.1600, 0.2001], [0.1600, 0.2505], [0.1502, 0.2505] ]
        },
        {
          "entity_type": "road",
          "vertices": [ [0.4001, 0.1005], [0.4503, 0.5002], [0.5001, 0.9008] ]
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
    
    // Clean JSON output
    const cleanJsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const detectedData = JSON.parse(cleanJsonStr);

    // TRANSLATION LAYER: Relative grid [0-1] to Real-World GPS GeoJSON
    const geoJsonFeatures = detectedData.features.map((item: any) => {
      
      const realWorldCoords = item.vertices.map((vertex: [number, number]) => {
        const [relX, relY] = vertex;
        const lng = bounds.west + relX * (bounds.east - bounds.west);
        const lat = bounds.north - relY * (bounds.north - bounds.south);
        return [lng, lat];
      });

      const isBuilding = item.entity_type === "building";

      // If building, close the polygon loop
      if (isBuilding && realWorldCoords.length > 2) {
        const first = realWorldCoords[0];
        const last = realWorldCoords[realWorldCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          realWorldCoords.push([...first]);
        }
      }

      return {
        type: "Feature",
        properties: { 
            source: "AGIS Nano Vision (Gemini 2.5 Flash)",
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
