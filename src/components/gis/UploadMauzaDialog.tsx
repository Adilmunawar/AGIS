
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Package, Layers, Square } from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import * as turf from '@turf/turf';

interface UploadMauzaDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (mauzaName: string) => Promise<void>;
  boundaryData: FeatureCollection | null;
  parcelsData: FeatureCollection | null;
}

const StatItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold">{value}</span>
    </div>
);

export function UploadMauzaDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  boundaryData,
  parcelsData,
}: UploadMauzaDialogProps) {
  const [mauzaName, setMauzaName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setMauzaName('');
      setIsUploading(false);
    }
  }, [isOpen]);

  const stats = useMemo(() => {
    const parcelCount = parcelsData?.features?.length || 0;
    let totalAreaSqm = 0;
    if (parcelsData) {
        try {
            totalAreaSqm = turf.area(parcelsData);
        } catch (e) {
            console.error("Could not calculate total area", e);
        }
    }
    const totalAreaAcres = totalAreaSqm * 0.000247105;
    
    return {
      parcelCount: parcelCount.toLocaleString(),
      boundaryFile: boundaryData ? 'Loaded' : 'Not Provided',
      totalArea: totalAreaAcres.toFixed(2),
    };
  }, [boundaryData, parcelsData]);

  const handleConfirm = async () => {
    if (!mauzaName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please provide a name for the Mauza.',
      });
      return;
    }
    setIsUploading(true);
    try {
        await onConfirm(mauzaName);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Dataset to Cloud</DialogTitle>
          <DialogDescription>
            Name your Mauza dataset and confirm the details before uploading to the database.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mauza-name">Mauza Name</Label>
            <Input
              id="mauza-name"
              value={mauzaName}
              onChange={(e) => setMauzaName(e.target.value)}
              placeholder="e.g., Chak 185/7-R"
              disabled={isUploading}
            />
          </div>
          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Upload Summary</h4>
            <StatItem icon={Package} label="Boundary File" value={stats.boundaryFile} />
            <StatItem icon={Layers} label="Total Parcels" value={stats.parcelCount} />
            <StatItem icon={Square} label="Total Area (Acres)" value={stats.totalArea} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isUploading || !mauzaName.trim()}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
