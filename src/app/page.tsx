'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { saveAs } from 'file-saver';
import type { GeoJsonObject } from 'geojson';

import { detectFromBounds, downloadShapefile, type BBox } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { ControlsSidebar } from '@/components/satellite-vision/controls-sidebar';

const MapComponent = dynamic(
  () => import('@/components/satellite-vision/map-component'),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />,
  }
);

export default function SatelliteVisionPage() {
  const [colabUrl, setColabUrl] = React.useState<string>('');
  const [geoJson, setGeoJson] = React.useState<GeoJsonObject | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [currentBBox, setCurrentBBox] = React.useState<BBox | null>(null);
  const [searchCoords, setSearchCoords] = React.useState<{ lat: number; lon: number } | null>(null);

  const { toast } = useToast();

  const handleDetect = React.useCallback(async () => {
    if (!colabUrl) {
      toast({
        variant: 'destructive',
        title: 'Missing URL',
        description: 'Please provide the Colab server URL.',
      });
      return;
    }
    if (!currentBBox) {
      toast({
        variant: 'destructive',
        title: 'Map not ready',
        description:
          'Please wait for the map to load or move the map to set a boundary.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const geoJsonData = await detectFromBounds(colabUrl, currentBBox);

      setGeoJson(geoJsonData);

      toast({
        title: 'Detection Complete',
        description: `Detected ${
          geoJsonData.features?.length ?? 0
        } building footprints.`,
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
  }, [colabUrl, currentBBox, toast]);

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
        description: 'Please run a detection first to generate building data.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const blob = await downloadShapefile(colabUrl);
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
          onDetect={handleDetect}
          onDownload={handleDownload}
          onSearchLocation={(lat, lon) => setSearchCoords({ lat, lon })}
          isLoading={isLoading}
          hasGeoJson={!!geoJson}
        />
      </Sidebar>
      <SidebarInset>
        <MapComponent 
          geoJsonData={geoJson} 
          setBBox={setCurrentBBox}
          searchResult={searchCoords}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
