'use client';

import { Card, CardContent } from '@/components/ui/card';

interface LegendProps {
  title: string;
  gradient: string;
  minLabel: string;
  maxLabel: string;
}

const Legend = ({ title, gradient, minLabel, maxLabel }: LegendProps) => (
  <Card className="bg-card/80 backdrop-blur-md shadow-lg border-border/50 animate-in fade-in duration-300 w-72">
    <CardContent className="p-2">
      <p className="text-xs font-semibold text-center mb-1.5">{title}</p>
      <div className={`h-2.5 w-full rounded-full ${gradient}`} />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </CardContent>
  </Card>
);

export function MapLegends({ currentBand }: { currentBand?: string }) {
  const legends: Record<string, LegendProps> = {
    'ndvi': {
      title: 'NDVI (Vegetation Health)',
      gradient: 'bg-gradient-to-r from-red-500 via-yellow-400 to-green-600',
      minLabel: 'Low',
      maxLabel: 'High',
    },
    'ndwi': {
      title: 'NDWI (Water Presence)',
      gradient: 'bg-gradient-to-r from-stone-400 via-cyan-300 to-blue-700',
      minLabel: 'Land',
      maxLabel: 'Water',
    },
    'savi': {
      title: 'SAVI (Soil-Adjusted Vegetation)',
      gradient: 'bg-gradient-to-r from-orange-800 via-yellow-400 to-green-700',
      minLabel: 'Low Veg',
      maxLabel: 'High Veg',
    },
    'evi': {
      title: 'EVI (Enhanced Vegetation)',
      gradient: 'bg-gradient-to-r from-orange-600 via-lime-400 to-emerald-800',
      minLabel: 'Low Veg',
      maxLabel: 'High Veg',
    },
    'forestChange': {
        title: 'Forest Change (1 Year)',
        gradient: 'bg-gradient-to-r from-green-500 to-red-500',
        minLabel: 'Reforestation',
        maxLabel: 'Deforestation',
    }
  };

  const legendProps = currentBand ? legends[currentBand] : null;

  if (!legendProps) {
    return null;
  }
  
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
      <Legend {...legendProps} />
    </div>
  );
}
