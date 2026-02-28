'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, Play, Server, ShieldAlert, Plus, Minus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface GisControlBarProps {
  title: React.ReactNode;
  hasSelection: boolean;
  isProcessing: boolean;
  geoData: any;
  colabUrl?: string;
  statusMessage: string | null;
  onRunStandard: () => void;
  onRunRealtime: () => void;
  onDownload: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  standardTab: {
    title: string;
    description: string;
    buttonText: string;
  };
  realtimeTab: {
    title: string;
    description: string;
    buttonText: string;
  };
}

export function GisControlBar({
  title,
  hasSelection,
  isProcessing,
  geoData,
  colabUrl,
  statusMessage,
  onRunStandard,
  onRunRealtime,
  onDownload,
  onZoomIn,
  onZoomOut,
  standardTab,
  realtimeTab,
}: GisControlBarProps) {
  const [activeTab, setActiveTab] = React.useState('standard');
  
  const getTooltipContent = () => {
    if (!hasSelection) return 'Please draw a polygon on the map to enable extraction.';
    switch(activeTab) {
      case 'standard':
        return standardTab.description;
      case 'realtime':
        return !colabUrl ? 'AGIS Realtime engine is unavailable. Please configure it on the Server Config page.' : realtimeTab.description;
      default:
        return '';
    }
  }


  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={onZoomIn}
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border-slate-200/50 bg-white/80 shadow-lg backdrop-blur-xl hover:bg-white/90"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p>Zoom In</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

        <Card className="rounded-xl border-slate-200/50 bg-white/80 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="p-2">
            <div className="flex w-full flex-wrap items-center justify-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 flex items-center gap-2 font-medium text-foreground">{title}</div>
                <p
                  className="text-xs text-muted-foreground hidden sm:block"
                >
                  {hasSelection ? 'Area selected.' : 'Draw a polygon to begin.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="standard">{standardTab.title}</TabsTrigger>
                    <TabsTrigger value="realtime">{realtimeTab.title}</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <div>
                            {activeTab === 'standard' && (
                              <Button onClick={onRunStandard} disabled={!hasSelection || isProcessing} size="sm">
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                {standardTab.buttonText}
                              </Button>
                            )}
                            {activeTab === 'realtime' && (!colabUrl ? (
                              <Button variant="outline" size="sm" disabled style={{pointerEvents: 'none'}}>
                                <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />
                                Server Not Connected
                              </Button>
                            ) : (
                              <Button onClick={onRunRealtime} disabled={!hasSelection || isProcessing} size="sm">
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                                {realtimeTab.buttonText}
                              </Button>
                            ))}
                          </div>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs max-w-xs">{getTooltipContent()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                    <Button onClick={onDownload} variant="outline" size="icon" className="h-9 w-9" disabled={!geoData}>
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p>Download GeoJSON</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                     <Button
                        onClick={onZoomOut}
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border-slate-200/50 bg-white/80 shadow-lg backdrop-blur-xl hover:bg-white/90"
                    >
                        <Minus className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p>Zoom Out</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
      
      <div
        className="flex items-center gap-2 rounded-full border border-slate-200/50 bg-white/80 px-4 py-1.5 text-xs shadow-lg backdrop-blur-xl"
      >
        {isProcessing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        <p className="text-muted-foreground">{statusMessage}</p>
      </div>
    </div>
  );
}
