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
      title: 'NDVI (Crop Health)',
      gradient: 'bg-gradient-to-r from-yellow-700 via-yellow-400 to-green-600',
      minLabel: 'Stressed',
      maxLabel: 'Healthy',
    },
    'ndmi': {
      title: 'NDMI (Moisture Index)',
      gradient: 'bg-gradient-to-r from-red-600 via-yellow-400 to-blue-600',
      minLabel: 'Dry',
      maxLabel: 'Wet',
    },
     'ndre': {
      title: 'NDRE (Nitrogen Content)',
      gradient: 'bg-gradient-to-r from-orange-400 via-yellow-300 to-teal-500',
      minLabel: 'Low',
      maxLabel: 'High',
    },
     'ndwi': {
      title: 'NDWI (Water Body)',
      gradient: 'bg-gradient-to-r from-stone-400 via-cyan-300 to-blue-700',
      minLabel: 'Land',
      maxLabel: 'Water',
    },
     'nbr': {
      title: 'NBR (Burn Scar)',
      gradient: 'bg-gradient-to-r from-red-600 via-yellow-400 to-green-800',
      minLabel: 'Burned',
      maxLabel: 'Unburned',
    },
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