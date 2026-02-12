'use client';

export async function detectBuildings(
  colabUrl: string,
  imageFile: File,
  points: { x: number; y: number }[] = []
) {
  // 1. Prepare FormData (Standard way to upload files)
  const formData = new FormData();
  formData.append('image', imageFile);
  
  // If points exist, send them. If empty, backend assumes "Automatic Mode"
  if (points.length > 0) {
    formData.append('points', JSON.stringify(points));
  }

  // 2. Call the Backend
  // Note: We use the '/detect' endpoint which matches your Flask app
  const response = await fetch(`${colabUrl}/detect`, {
    method: 'POST',
    body: formData,
    headers: {
      // Ngrok often shows a warning page for free accounts. This header skips it.
      'ngrok-skip-browser-warning': 'true',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server Error: ${response.status} - ${errorText}`);
  }

  // 3. Return the GeoJSON
  return await response.json();
}

export async function downloadShapefile(colabUrl: string) {
    const response = await fetch(`${colabUrl}/download_shp`, {
        method: 'GET',
        headers: {
            'ngrok-skip-browser-warning': 'true',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${response.status} - ${errorText}`);
    }
    return response.blob();
}
