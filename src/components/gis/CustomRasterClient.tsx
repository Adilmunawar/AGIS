'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Image as ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import { LocationSearch } from './LocationSearch';

type AssetVis = {
  name: string;
  url: string;
};

export default function CustomRasterClient() {
  const [assetId, setAssetId] = useState('');
  const [assetTiles, setAssetTiles] = useState<Record<string, AssetVis> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVis, setSelectedVis] = useState<string | null>(null);

  const handleLoadAsset = async () => {
    if (!assetId) {
      setError('Please enter a Google Earth Engine Asset ID.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAssetTiles(null);
    setSelectedVis(null);

    try {
      const res = await fetch(`/api/gee/tiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setAssetTiles(data.tiles);
        // Automatically select the first available visualization
        const firstVisKey = Object.keys(data.tiles)[0];
        if (firstVisKey) {
          setSelectedVis(firstVisKey);
        }
      } else {
        throw new Error(data.error || 'Failed to load asset.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const activeTileUrl = selectedVis && assetTiles ? assetTiles[selectedVis]?.url : null;

  return (
    <div className="absolute inset-0 bg-background overflow-hidden">
        <MapContainer center={[30.6682, 73.1114]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}>
            <TileLayer attribution='&copy; Google' url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" zIndex={1} />
            
            {activeTileUrl && (
              <TileLayer key={activeTileUrl} url={activeTileUrl} opacity={0.9} zIndex={10} />
            )}

            <div className="absolute top-4 left-4 z-[1000]">
              <LocationSearch />
            </div>

            <Card className="absolute top-4 right-4 z-[1000] w-80 bg-card/80 backdrop-blur-md shadow-2xl border-border/50">
                <CardHeader className="p-4 border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ImageIcon className="h-5 w-5 text-primary" />
                        Custom Raster Explorer
                    </CardTitle>
                    <CardDescription className="text-xs pt-1">
                        Upload a raster to your GEE Assets, then paste the Asset ID below to visualize it.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="asset-id" className="font-semibold">GEE Asset ID</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="asset-id" 
                        placeholder="e.g., users/username/asset_name"
                        value={assetId}
                        onChange={(e) => setAssetId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLoadAsset()}
                        disabled={isLoading}
                      />
                      <Button onClick={handleLoadAsset} disabled={isLoading || !assetId}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
                      </Button>
                    </div>
                  </div>

                  {error && (
                     <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                        <AlertTriangle className="h-4 w-4" />
                        <div>
                            <p className="font-semibold">Error</p>
                            <p className="text-xs">{error}</p>
                        </div>
                    </div>
                  )}

                  {assetTiles && (
                    <div className="space-y-3 pt-2 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500"/>
                            <Label className="font-semibold">Visualizations</Label>
                        </div>
                        <RadioGroup value={selectedVis || ''} onValueChange={setSelectedVis}>
                            {Object.entries(assetTiles).map(([key, vis]) => (
                                <div key={key} className="flex items-center space-x-2">
                                    <RadioGroupItem value={key} id={key} />
                                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">{vis.name}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                  )}
                </CardContent>
            </Card>
        </MapContainer>
    </div>
  );
}
