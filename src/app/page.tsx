'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { saveAs } from 'file-saver';
import type { GeoJsonObject } from 'geojson';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import {
  detectFromBounds,
  downloadGeoJson,
  type BBox,
  type GeoPoint,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { ControlsSidebar } from '@/components/satellite-vision/controls-sidebar';
import { useUser } from '@/firebase';

const MapComponent = dynamic(
  () => import('@/components/satellite-vision/map-component'),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />,
  }
);

export default function SatelliteVisionPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [colabUrl, setColabUrl] = React.useState<string>('');
  const [geoJson, setGeoJson] = React.useState<GeoJsonObject | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [currentBBox, setCurrentBBox] = React.useState<BBox | null>(null);
  const [points, setPoints] = React.useState<GeoPoint[]>([]);

  const [searchCoords, setSearchCoords] =
    React.useState<{ lat: number; lon: number } | null>(null);
  const [manualFeatures, setManualFeatures] =
    React.useState<GeoJsonObject | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  const { toast } = useToast();

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSetBBox = React.useCallback((bbox: BBox | null) => {
    setCurrentBBox(bbox);
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
    setGeoJson(null);
    try {
      const geoJsonData = await detectFromBounds(colabUrl, currentBBox, points);

      setGeoJson(geoJsonData);
      const detectionMode = points.length > 0 ? 'point-guided' : 'automatic';
      toast({
        title: 'Detection Complete',
        description: `Detected ${
          geoJsonData.features?.length ?? 0
        } building footprints using ${detectionMode} mode.`,
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
  }, [colabUrl, currentBBox, points, toast]);

  const handleDownloadGeoJson = React.useCallback(async () => {
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
      const blob = await downloadGeoJson(colabUrl);
      saveAs(blob, 'detected_buildings.zip');
      toast({
        title: 'Download Started',
        description: 'Your Shapefile is being downloaded.',
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

  const handleDownloadDigitized = React.useCallback(() => {
    if (
      !manualFeatures ||
      !manualFeatures.features ||
      manualFeatures.features.length === 0
    ) {
      toast({
        variant: 'destructive',
        title: 'No Digitized Features',
        description: 'Draw some shapes on the map first to digitize features.',
      });
      return;
    }

    try {
      const geoJsonString = JSON.stringify(manualFeatures, null, 2);
      const blob = new Blob([geoJsonString], { type: 'application/json' });
      saveAs(blob, 'digitized_layer.geojson');
      toast({
        title: 'Download Started',
        description: 'Your digitized GeoJSON layer is downloading.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    }
  }, [manualFeatures, toast]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <ControlsSidebar
          colabUrl={colabUrl}
          setColabUrl={setColabUrl}
          onDetect={handleDetect}
          onDownload={handleDownloadGeoJson}
          onDownloadDigitized={handleDownloadDigitized}
          onSearchLocation={(lat, lon) => setSearchCoords({ lat, lon })}
          isLoading={isLoading}
          hasGeoJson={!!geoJson}
          hasSelection={isDrawing || points.length > 0}
          hasManualFeatures={!!manualFeatures?.features?.length}
        />
      </Sidebar>
      <SidebarInset>
        <MapComponent
          geoJsonData={geoJson}
          setBBox={handleSetBBox}
          setPoints={setPoints}
          searchResult={searchCoords}
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
          onManualFeaturesChange={setManualFeatures}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
