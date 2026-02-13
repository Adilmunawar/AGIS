'use client';

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export async function detectFromBounds(colabUrl: string, bbox: BBox) {
  const response = await fetch(`${colabUrl}/detect_bbox`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server Error: ${response.status} - ${errorText}`);
  }

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
