'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { LatLng } from 'leaflet';
import { saveAs } from 'file-saver';
import type { GeoJsonObject } from 'geojson';

import { detectBuildingsFromSatelliteImage } from '@/ai/flows/detect-buildings-flow';
import { useToast } from '@/hooks/use-toast';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { ControlsSidebar } from '@/components/satellite-vision/controls-sidebar';

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(
  () => import('@/components/satellite-vision/map-component'),
  {
    ssr: false,
    loading: () => <div className="flex h-full w-full items-center justify-center bg-muted"><p>Loading Map...</p></div>,
  }
);

export default function SatelliteVisionPage() {
  const [colabUrl, setColabUrl] = React.useState<string>('');
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const [points, setPoints] = React.useState<LatLng[]>([]);
  const [geoJson, setGeoJson] = React.useState<GeoJsonObject | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const { toast } = useToast();

  const handleFileDrop = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
          setImageUrl(e.target?.result as string);
          setPoints([]);
          setGeoJson(null);
          toast({
            title: 'Image Loaded',
            description: 'Click on the image to place markers for detection.',
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a .png or .jpg file.',
      });
    }
  }, [toast]);

  const handleMapClick = React.useCallback((latlng: LatLng) => {
    setPoints((prev) => [...prev, latlng]);
  }, []);

  const handleClearPoints = React.useCallback(() => {
    setPoints([]);
  }, []);

  const handleDetect = React.useCallback(async () => {
    if (!colabUrl) {
      toast({
        variant: 'destructive',
        title: 'Missing URL',
        description: 'Please provide the Colab server URL.',
      });
      return;
    }
    if (!imageUrl) {
      toast({
        variant: 'destructive',
        title: 'Missing Image',
        description: 'Please upload a satellite image.',
      });
      return;
    }
    if (points.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No points selected',
        description: 'Please click on the image to select points of interest.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await detectBuildingsFromSatelliteImage({
        imageDataUri: imageUrl,
        // In CRS.Simple, lat is Y, lng is X. The AI model expects x, y.
        coordinates: points.map((p) => ({ x: p.lng, y: p.lat })),
        colabServerUrl: colabUrl,
      });
      
      const parsedGeoJson = JSON.parse(result.geoJson);
      setGeoJson(parsedGeoJson);

      toast({
        title: 'Detection Complete',
        description: 'Building outlines have been rendered on the map.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Detection Failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [colabUrl, imageUrl, points, toast]);

  const handleDownload = React.useCallback(async () => {
    if (!colabUrl) {
      toast({
        variant: 'destructive',
        title: 'Missing URL',
        description: 'Please provide the Colab server URL.',
      });
      return;
    }
    if (!geoJson) {
      toast({
        variant: 'destructive',
        title: 'No Data to Download',
        description: 'Please run the detection first to generate building data.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${colabUrl}/download_shp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ geojson_data: geoJson }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const blob = await response.blob();
      saveAs(blob, 'detected_buildings.zip');
      toast({
        title: 'Download Started',
        description: 'Your shapefile is being downloaded.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [colabUrl, geoJson, toast]);


  return (
    <SidebarProvider>
      <Sidebar>
        <ControlsSidebar
          colabUrl={colabUrl}
          setColabUrl={setColabUrl}
          onFileDrop={handleFileDrop}
          onDetect={handleDetect}
          onDownload={handleDownload}
          onClearPoints={handleClearPoints}
          isLoading={isLoading}
          hasImage={!!imageUrl}
          hasPoints={points.length > 0}
          hasGeoJson={!!geoJson}
        />
      </Sidebar>
      <SidebarInset>
        <MapComponent
          imageUrl={imageUrl}
          imageDimensions={imageDimensions}
          points={points}
          geoJson={geoJson}
          onMapClick={handleMapClick}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
