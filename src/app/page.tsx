'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { saveAs } from 'file-saver';
import type { GeoJsonObject } from 'geojson';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import {
  detectFromBounds,
  downloadGeoJson as downloadShapefile,
  type BBox,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  ControlsSidebar,
  ActiveTool,
} from '@/components/satellite-vision/controls-sidebar';
import { useUser } from '@/firebase';
import { MapSearch } from '@/components/satellite-vision/map-search';
import { ConnectServerDialog } from '@/components/satellite-vision/connect-server-dialog';
import { cn } from '@/lib/utils';
import { MapLayerSwitcher } from '@/components/satellite-vision/map-layer-switcher';
import { mapLayers, type MapLayer } from '@/lib/map-layers';
import { MapActions } from '@/components/satellite-vision/map-actions';

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
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const [searchCoords, setSearchCoords] =
    React.useState<{ lat: number; lon: number } | null>(null);
  const [manualFeatures, setManualFeatures] =
    React.useState<GeoJsonObject | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [activeTool, setActiveTool] = React.useState<ActiveTool>('detection');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [currentLayer, setCurrentLayer] = React.useState<MapLayer>(mapLayers[0]);
  
  // New state for drawing styles
  const [drawColor, setDrawColor] = React.useState('hsl(var(--primary))');
  const [lineStyle, setLineStyle] = React.useState<'solid' | 'dashed'>('solid');


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
        title: 'Server Not Connected',
        description:
          'Please connect to the backend server in the settings first.',
      });
      setIsSettingsOpen(true);
      return;
    }
    if (!currentBBox || !isDrawing) {
      toast({
        variant: 'destructive',
        title: 'No Area Selected',
        description:
          'Please draw a rectangle on the map to define an area for detection.',
      });
      return;
    }

    setIsLoading(true);
    setGeoJson(null);
    try {
      if (!currentBBox) {
        throw new Error('Bounding box is not defined.');
      }
      
      const geoJsonData = await detectFromBounds(colabUrl, currentBBox);

      setGeoJson(geoJsonData);
      toast({
        title: 'Detection Complete',
        description: `Detected ${
          (geoJsonData as any).features?.length ?? 0
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
  }, [colabUrl, currentBBox, toast, isDrawing]);

  const handleDownloadGeoJson = React.useCallback(async () => {
    if (!colabUrl) {
      toast({
        variant: 'destructive',
        title: 'Server Not Connected',
        description:
          'Please connect to the backend server in the settings first.',
      });
      setIsSettingsOpen(true);
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
      !(manualFeatures as any).features ||
      (manualFeatures as any).features.length === 0
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

  const handleSaveSettings = () => {
    setIsSettingsOpen(false);
    if (colabUrl) {
      toast({
        title: 'Server Connected',
        description: 'The backend server URL has been saved.',
      });
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const hasSelection = isDrawing;

  return (
    <div className={cn(
        "relative h-svh w-full overflow-hidden bg-background text-foreground",
        isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
    )}>
      <ControlsSidebar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="relative h-full w-full">
        <MapComponent
          layerUrl={currentLayer.url}
          layerAttribution={currentLayer.attribution}
          geoJsonData={geoJson}
          setBBox={handleSetBBox}
          searchResult={searchCoords}
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
          onManualFeaturesChange={setManualFeatures}
          activeTool={activeTool}
          isSidebarCollapsed={isSidebarCollapsed}
          drawColor={drawColor}
          lineStyle={lineStyle}
          mapActions={
             <MapActions
                activeTool={activeTool}
                isLoading={isLoading}
                hasSelection={hasSelection}
                hasGeoJson={!!geoJson}
                hasManualFeatures={!!(manualFeatures as any)?.features?.length}
                onDetect={handleDetect}
                onDownload={handleDownloadGeoJson}
                onDownloadDigitized={handleDownloadDigitized}
                drawColor={drawColor}
                setDrawColor={setDrawColor}
                lineStyle={lineStyle}
                setLineStyle={setLineStyle}
             />
          }
        />
        
        <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
           <MapLayerSwitcher
              layers={mapLayers}
              currentLayer={currentLayer}
              onLayerChange={setCurrentLayer}
            />
        </div>
        <div className="absolute top-4 right-4 z-[1000]">
            <div className="w-80 max-w-xs">
                <MapSearch onSearchLocation={(lat, lon) => setSearchCoords({ lat, lon })} />
            </div>
        </div>
      </main>
      <ConnectServerDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        colabUrl={colabUrl}
        setColabUrl={setColabUrl}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
