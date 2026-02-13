'use client';

import * as React from 'react';
import { Download, Loader2, Satellite, Search } from 'lucide-react';

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

type ControlsSidebarProps = {
  colabUrl: string;
  setColabUrl: (url: string) => void;
  onDetect: () => void;
  onDownload: () => void;
  isLoading: boolean;
  hasGeoJson: boolean;
};

export function ControlsSidebar({
  colabUrl,
  setColabUrl,
  onDetect,
  onDownload,
  isLoading,
  hasGeoJson,
}: ControlsSidebarProps) {
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
          <SidebarGroupLabel>2. Detect</SidebarGroupLabel>
          <div className="flex items-start gap-2 rounded-md bg-background p-2 text-sm text-muted-foreground">
            <Search className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Pan and zoom the map to your area of interest, then click the
              detect button below.
            </span>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator />
        <div className="flex flex-col gap-2 p-4">
          <Button onClick={onDetect} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Detect Buildings in View
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
