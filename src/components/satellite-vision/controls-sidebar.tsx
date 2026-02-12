'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, MapPin, BrainCircuit, Download, Trash2, Loader2, Satellite } from 'lucide-react';

import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';

type ControlsSidebarProps = {
  colabUrl: string;
  setColabUrl: (url: string) => void;
  onFileDrop: (files: File[]) => void;
  onDetect: () => void;
  onDownload: () => void;
  onClearPoints: () => void;
  isLoading: boolean;
  hasImage: boolean;
  hasPoints: boolean;
  hasGeoJson: boolean;
};

export function ControlsSidebar({
  colabUrl,
  setColabUrl,
  onFileDrop,
  onDetect,
  onDownload,
  onClearPoints,
  isLoading,
  hasImage,
  hasPoints,
  hasGeoJson,
}: ControlsSidebarProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    multiple: false,
  });

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <Satellite className="text-primary" />
            <h1 className="text-xl font-semibold">Satellite Vision</h1>
        </div>
        <Separator />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>1. Connect</SidebarGroupLabel>
          <Input
            type="url"
            placeholder="Enter your Colab server URL"
            value={colabUrl}
            onChange={(e) => setColabUrl(e.target.value)}
            disabled={isLoading}
          />
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>2. Upload Image</SidebarGroupLabel>
          <Card
            {...getRootProps()}
            className={`cursor-pointer border-2 border-dashed transition-colors ${
              isDragActive ? 'border-primary bg-accent' : 'hover:border-primary/50'
            }`}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <input {...getInputProps()} />
              <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
              {isDragActive ? (
                <p className="font-semibold text-primary">Drop the image here...</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Drag & drop a satellite image here, or click to select
                </p>
              )}
              <p className="text-xs text-muted-foreground/80 mt-1">PNG or JPG</p>
            </CardContent>
          </Card>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>3. Select Points</SidebarGroupLabel>
           <div className="text-sm text-muted-foreground p-2 rounded-md bg-background flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0"/>
                <span>Click on the loaded image to place markers on buildings of interest.</span>
           </div>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearPoints} 
                disabled={!hasPoints || isLoading}
                className="w-full mt-2"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Markers
            </Button>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator />
        <div className="flex flex-col gap-2 p-4">
          <Button onClick={onDetect} disabled={!hasImage || !hasPoints || isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BrainCircuit className="mr-2 h-4 w-4" />
            )}
            Detect Buildings
          </Button>
          <Button
            variant="secondary"
            onClick={onDownload}
            disabled={!hasGeoJson || isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Shapefile
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
