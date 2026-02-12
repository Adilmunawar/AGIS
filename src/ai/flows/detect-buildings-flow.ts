'use server';
/**
 * @fileOverview This file defines a Genkit flow for detecting buildings in a satellite image
 * using an external Colab backend.
 *
 * - detectBuildingsFromSatelliteImage - A function that orchestrates the building detection process.
 * - DetectBuildingsFromSatelliteImageInput - The input type for the detectBuildingsFromSatelliteImage function.
 * - DetectBuildingsFromSatelliteImageOutput - The return type for the detectBuildingsFromSatelliteImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import fetch from 'node-fetch'; // Ensure 'node-fetch' is installed if not using native fetch in your environment

const DetectBuildingsFromSatelliteImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A satellite image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  coordinates: z
    .array(z.object({x: z.number(), y: z.number()}))
    .describe('An array of pixel coordinates [x, y] representing points of interest for building detection.'),
  colabServerUrl: z
    .string()
    .url('colabServerUrl must be a valid URL.')
    .describe('The URL of the Google Colab backend server for AI processing.'),
});
export type DetectBuildingsFromSatelliteImageInput = z.infer<typeof DetectBuildingsFromSatelliteImageInputSchema>;

const DetectBuildingsFromSatelliteImageOutputSchema = z.object({
  geoJson: z.string().describe('GeoJSON data representing the detected buildings as polygons.'),
});
export type DetectBuildingsFromSatelliteImageOutput = z.infer<typeof DetectBuildingsFromSatelliteImageOutputSchema>;

// Define the tool that interacts with the Colab backend for building detection.
const detectBuildingsTool = ai.defineTool(
  {
    name: 'detectBuildings',
    description:
      'Sends a satellite image and clicked coordinates to a Colab backend for AI-powered building detection and returns GeoJSON data.',
    inputSchema: DetectBuildingsFromSatelliteImageInputSchema,
    outputSchema: DetectBuildingsFromSatelliteImageOutputSchema,
  },
  async ({imageDataUri, coordinates, colabServerUrl}) => {
    try {
      const response = await fetch(`${colabServerUrl}/detect_buildings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Colab-Verification': 'true', // Special header for validation as per proposal
        },
        body: JSON.stringify({
          image_data_uri: imageDataUri,
          coordinates: coordinates,
        }),
        // Set a generous timeout for potentially long AI processing on the Colab backend
        timeout: 120000, // 2 minutes
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Colab server error: ${response.status} - ${errorText}`);
      }

      const data: DetectBuildingsFromSatelliteImageOutput = await response.json();
      // Validate the GeoJSON structure received from the backend.
      if (!data || typeof data.geoJson !== 'string') {
        throw new Error('Invalid response format from Colab server: expected an object with a geoJson string property.');
      }
      return data;
    } catch (error: any) {
      console.error('Error calling Colab backend for building detection:', error);
      throw new Error(`Failed to detect buildings: ${error.message}`);
    }
  }
);

// Define the prompt that uses the detectBuildings tool.
const buildingDetectionPrompt = ai.definePrompt({
  name: 'buildingDetectionPrompt',
  tools: [detectBuildingsTool],
  input: { schema: DetectBuildingsFromSatelliteImageInputSchema },
  output: { schema: DetectBuildingsFromSatelliteImageOutputSchema },
  // The system prompt instructs the LLM on when and how to use the 'detectBuildings' tool.
  system: `You are an AI assistant specialized in satellite image analysis.
  Your task is to detect buildings in a satellite image based on user-provided coordinates using an external Colab backend.
  When you are provided with a satellite image (as a data URI), pixel coordinates, and a Colab server URL,
  you MUST use the 'detectBuildings' tool to perform the building detection.
  Your final output MUST ONLY be the GeoJSON data returned by the 'detectBuildings' tool, with no additional text or explanations.`, 
  // The user prompt passes the input context to the LLM, which will then decide to use the tool.
  prompt: `Please detect buildings based on the following information:
  Satellite Image: {{media url=imageDataUri}}
  Clicked Coordinates: {{{JSON.stringify coordinates}}}
  Colab Backend URL: {{{colabServerUrl}}}`
});

// Define the main Genkit flow for building detection.
const detectBuildingsFlow = ai.defineFlow(
  {
    name: 'detectBuildingsFlow',
    inputSchema: DetectBuildingsFromSatelliteImageInputSchema,
    outputSchema: DetectBuildingsFromSatelliteImageOutputSchema,
  },
  async (input) => {
    // The LLM, guided by the prompt, will orchestrate the call to the 'detectBuildings' tool.
    const { output } = await buildingDetectionPrompt(input);
    return output!; // The prompt's output is directly the GeoJSON from the tool.
  }
);

/**
 * Orchestrates the building detection process by sending a satellite image and coordinates
 * to a Colab backend via a Genkit AI agent, and returns GeoJSON data of detected buildings.
 * @param input - Contains the satellite image data URI, clicked coordinates, and Colab server URL.
 * @returns A promise that resolves to an object containing the GeoJSON data of detected buildings.
 */
export async function detectBuildingsFromSatelliteImage(
  input: DetectBuildingsFromSatelliteImageInput
): Promise<DetectBuildingsFromSatelliteImageOutput> {
  return detectBuildingsFlow(input);
}
