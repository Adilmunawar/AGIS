import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64, bounds, apiKey } = await req.json();
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 401 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro-latest", // Using 1.5 Pro for better performance
    });

    // THE MASTER SPATIAL PROMPT
    const prompt = `
    You are an expert Cadastral GIS AI. Extract precise property boundaries and building footprints from this satellite image.
    
    INSTRUCTIONS:
    1. Identify every distinct building or property boundary.
    2. Trace the shape using a minimum of 4 and a maximum of 8 vertices to capture true geometric shape (not just square bounding boxes).
    3. Output coordinates as a normalized relative spatial grid: [0.000, 0.000] is Top-Left, [1.000, 1.000] is Bottom-Right.
    
    OUTPUT FORMAT MUST BE STRICTLY THIS JSON SCHEMA:
    {
      "features": [
        {
          "type": "polygon",
          "vertices": [ [0.150, 0.200], [0.150, 0.350], [0.250, 0.350], [0.250, 0.200] ]
        }
      ]
    }
    `;

    const imagePart = { inlineData: { data: imageBase64.split(',')[1], mimeType: "image/jpeg" } };
    const result = await model.generateContent([prompt, imagePart]);
    
    // Clean up the response text before parsing
    const responseText = result.response.text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const detectedData = JSON.parse(responseText);


    // TRANSLATION LAYER: Relative grid [0-1] to Real-World GPS GeoJSON
    const geoJsonFeatures = detectedData.features.map((item: any) => {
      const realWorldCoords = item.vertices.map((vertex: [number, number]) => {
        const [relX, relY] = vertex;
        const lng = bounds.west + relX * (bounds.east - bounds.west);
        const lat = bounds.north - relY * (bounds.north - bounds.south);
        return [lng, lat];
      });

      // Close the GeoJSON polygon loop
      if (realWorldCoords.length > 0 && (realWorldCoords[0][0] !== realWorldCoords[realWorldCoords.length - 1][0] || realWorldCoords[0][1] !== realWorldCoords[realWorldCoords.length - 1][1])) {
        realWorldCoords.push(realWorldCoords[0]);
      }


      return {
        type: "Feature",
        properties: { source: "AGIS Nano Vision (Gemini 1.5 Pro)" },
        geometry: { type: "Polygon", coordinates: [realWorldCoords] }
      };
    });

    return NextResponse.json({ type: "FeatureCollection", features: geoJsonFeatures });
  } catch (error: any) {
    console.error("Gemini Digitization Error:", error);
    let errorMessage = "An unknown error occurred during Nano Vision processing.";
    if (error.message.includes('API key not valid')) {
        errorMessage = "Invalid Gemini API Key. Please check the key in Server Config.";
    } else if (error.message.includes('permission')) {
        errorMessage = "API key does not have permission for the Gemini 1.5 Pro model.";
    } else if (error instanceof SyntaxError) {
        errorMessage = "The AI model returned an invalid data structure. Please try again.";
    }
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
  }
}
