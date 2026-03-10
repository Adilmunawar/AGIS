'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Droplets } from 'lucide-react';

interface MapLegendsProps {
  currentBand: string;
}

const NdviLegend = () => (
  <Card className="w-64 bg-card/80 backdrop-blur-md shadow-lg border-border/50">
    <CardHeader className="flex-row items-center space-y-0 p-3">
      <Leaf className="h-5 w-5 mr-2 text-primary" />
      <CardTitle className="text-sm font-semibold">NDVI (Crop Health)</CardTitle>
    </CardHeader>
    <CardContent className="p-3 pt-0">
      <div className="h-3 w-full rounded-full bg-gradient-to-r from-yellow-700 via-yellow-400 to-green-600" />
      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
        <span>Stressed</span>
        <span>Healthy</span>
      </div>
    </CardContent>
  </Card>
);

const NdmiLegend = () => (
  <Card className="w-64 bg-card/80 backdrop-blur-md shadow-lg border-border/50">
    <CardHeader className="flex-row items-center space-y-0 p-3">
      <Droplets className="h-5 w-5 mr-2 text-blue-500" />
      <CardTitle className="text-sm font-semibold">NDMI (Moisture Index)</CardTitle>
    </CardHeader>
    <CardContent className="p-3 pt-0">
      <div className="h-3 w-full rounded-full bg-gradient-to-r from-red-600 via-yellow-400 to-blue-600" />
      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
        <span>Dry</span>
        <span>Wet</span>
      </div>
    </CardContent>
  </Card>
);

export function MapLegends({ currentBand }: MapLegendsProps) {
  if (currentBand !== '3_NDVI' && currentBand !== '4_NDMI') {
    return null;
  }
  
  return (
    <div className="absolute bottom-4 right-4 z-[1000] space-y-2 animate-in fade-in duration-500">
      {currentBand === '3_NDVI' && <NdviLegend />}
      {currentBand === '4_NDMI' && <NdmiLegend />}
    </div>
  );
}
