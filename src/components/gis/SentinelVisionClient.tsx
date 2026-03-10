'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, GeoJSON, Popup, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import { format } from 'date-fns';
import * as turf from '@turf/turf';

import { useGisData } from '@/context/GisDataContext';
import { cn } from '@/lib/utils';
import { MapLegends } from './MapLegends';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Satellite, Calendar as CalendarIcon, GitBranch, Cloudy, Info, Loader2, BarChart, Droplets, Wheat } from 'lucide-react';

// --- MOCK API & TYPES ---
interface AnalysisData {
  crop: string;
  ndvi: string;
  moisture: string;
}

const mockFetchAnalysisData = async (featureId: string): Promise<AnalysisData> => {
  console.log(`Fetching analysis for feature: ${featureId}`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  // In a real app, you might have different results based on featureId
  return {
    crop: 'Wheat',
    ndvi: '0.82 - Excellent',
    moisture: '0.25 m³/m³'
  };
};

const sentinelBands = [
  { value: '1_TRUE_COLOR', label: 'True Color (RGB)', description: 'Natural view, as seen by the human eye.' },
  { value: '2_FALSE_COLOR', label: 'False Color (Infrared)', description: 'Highlights vegetation in shades of red.' },
  { value: '3_NDVI', label: 'NDVI (Vegetation Index)', description: 'Measures crop health and vigor.' },
  { value: '4_NDMI', label: 'NDMI (Moisture Index)', description: 'Indicates water stress in soil and plants.' },
];

// --- ANALYSIS POPUP COMPONENT ---
const AnalysisPopupContent = ({ featureId }: { featureId: string }) => {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await mockFetchAnalysisData(featureId);
        setData(result);
      } catch (err) {
        setError('Failed to fetch analysis data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [featureId]);

  if (loading) {
    return <div className="flex items-center justify-center p-4 w-48"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (error || !data) {
    return <div className="p-4 text-destructive">{error || 'No data available.'}</div>;
  }

  return (
    <div className="w-48">
      <div className="flex items-center gap-3 border-b pb-2 mb-2">
        <Wheat className="h-5 w-5 text-amber-600" />
        <div>
            <p className="text-xs text-muted-foreground">Crop Type</p>
            <p className="font-semibold">{data.crop}</p>
        </div>
      </div>
       <div className="flex items-center gap-3 border-b pb-2 mb-2">
        <BarChart className="h-5 w-5 text-green-600" />
        <div>
            <p className="text-xs text-muted-foreground">NDVI Health</p>
            <p className="font-semibold">{data.ndvi}</p>
        </div>
      </div>
       <div className="flex items-center gap-3">
        <Droplets className="h-5 w-5 text-blue-600" />
        <div>
            <p className="text-xs text-muted-foreground">Moisture</p>
            <p className="font-semibold">{data.moisture}</p>
        </div>
      </div>
    </div>
  );
};


// --- MAP CLICK HANDLER COMPONENT ---
const MapClickHandler = ({ onFeatureClick }: { onFeatureClick: (latlng: LatLng, feature: any) => void }) => {
  const { importParcels: { parcelsData } } = useGisData();
  const map = useMap();

  useMapEvents({
    click(e) {
      if (!parcelsData?.features) return;
      
      const point = turf.point([e.latlng.lng, e.latlng.lat]);
      let foundFeature = null;

      for (const feature of parcelsData.features) {
        if (feature.geometry && turf.booleanPointInPolygon(point, feature as any)) {
          foundFeature = feature;
          break;
        }
      }

      if (foundFeature) {
        onFeatureClick(e.latlng, foundFeature);
      }
    },
  });

  return null;
};

// --- MAIN CLIENT COMPONENT ---
export default function SentinelVisionClient() {
  const [mapDate, setMapDate] = useState<Date>(new Date());
  const [selectedBand, setSelectedBand] = useState<string>(sentinelBands[0].value);
  const [wmsOpacity, setWmsOpacity] = useState<number>(0.7);
  const [popup, setPopup] = useState<{ latlng: LatLng, featureId: string } | null>(null);

  const { importParcels: { parcelsData } } = useGisData();
  
  const wmsTime = useMemo(() => {
    const formattedDate = format(mapDate, 'yyyy-MM-dd');
    return `${formattedDate}/${formattedDate}`;
  }, [mapDate]);

  const handleFeatureClick = useCallback((latlng: LatLng, feature: any) => {
    setPopup({ latlng, featureId: feature.id || `feature-${Date.now()}` });
  }, []);

  const parcelStyle = {
    fillColor: "hsl(var(--primary))",
    fillOpacity: 0.1,
    color: "hsl(var(--primary))",
    weight: 2,
  };

  return (
    <div className="h-full w-full flex bg-muted/20">
      {/* --- Sidebar --- */}
      <aside className="w-80 h-full flex-shrink-0 p-4">
        <Card className="h-full w-full flex flex-col shadow-lg border-border/80">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border">
                    <Satellite className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <CardTitle>Sentinel Vision</CardTitle>
                    <CardDescription>Remote farm monitoring</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-6 overflow-y-auto">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="date-picker">Imaging Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-picker"
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !mapDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {mapDate ? format(mapDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={mapDate} onSelect={(d) => d && setMapDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Band Selector */}
            <div className="space-y-2">
              <Label>Spectral Band</Label>
              <Select value={selectedBand} onValueChange={setSelectedBand}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a band" />
                </SelectTrigger>
                <SelectContent>
                  {sentinelBands.map((band) => (
                    <SelectItem key={band.value} value={band.value}>
                        <div className="flex flex-col">
                            <span className="font-medium">{band.label}</span>
                            <span className="text-xs text-muted-foreground">{band.description}</span>
                        </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-2 pt-2">
              <Label>Satellite Layer Opacity</Label>
              <Slider
                defaultValue={[wmsOpacity * 100]}
                max={100}
                step={1}
                onValueChange={(value) => setWmsOpacity(value[0] / 100)}
              />
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* --- Map Area --- */}
      <main className="flex-1 h-full p-4 pl-0">
        <div className="h-full w-full rounded-lg overflow-hidden relative shadow-lg">
          <MapContainer
            center={[31.46, 74.38]}
            zoom={13}
            zoomControl={false}
            style={{ height: '100%', width: '100%', backgroundColor: '#f0f0f0' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.google.com/permissions">Google</a>'
              url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            />
            
            <WMSTileLayer
              key={`${selectedBand}-${wmsTime}`}
              url="https://sh.dataspace.copernicus.eu/ogc/wms/8e33f681-f981-435a-94c7-55e803fb0592"
              params={{
                layers: selectedBand,
                format: 'image/png',
                transparent: true,
                time: wmsTime,
              }}
              opacity={wmsOpacity}
              zIndex={10}
            />

            {parcelsData && <GeoJSON data={parcelsData} style={parcelStyle} />}
            
            <MapClickHandler onFeatureClick={handleFeatureClick} />

            {popup && (
              <Popup position={popup.latlng} onOpenChange={() => setPopup(null)}>
                <AnalysisPopupContent featureId={popup.featureId} />
              </Popup>
            )}
          </MapContainer>
          
          {!parcelsData || parcelsData.features.length === 0 ? (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                <Alert variant="destructive" className="bg-background/80 backdrop-blur-md">
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Parcel Data</AlertTitle>
                    <AlertDescription>
                        Upload a shapefile in the 'Import Parcels' tab to see farm boundaries.
                    </AlertDescription>
                </Alert>
            </div>
          ) : null}

          <MapLegends currentBand={selectedBand} />
        </div>
      </main>
    </div>
  );
}
