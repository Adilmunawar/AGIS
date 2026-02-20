'use client';

import * as React from 'react';
import { Bot, Download, Loader2, MapPin, PenSquare, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import type { ActiveTool } from './controls-sidebar';

type MapActionsProps = {
    activeTool: ActiveTool;
    isLoading: boolean;
    hasSelection: boolean;
    hasGeoJson: boolean;
    hasManualFeatures: boolean;
    onDetect: () => void;
    onDownload: () => void;
    onDownloadDigitized: () => void;
}

export function MapActions({
    activeTool,
    isLoading,
    hasSelection,
    hasGeoJson,
    hasManualFeatures,
    onDetect,
    onDownload,
    onDownloadDigitized
}: MapActionsProps) {

    // This component is now a floating panel. We'll use the activeTool prop
    // to decide which tab should be active by default, but the user can switch.
    // In a real app, you might want to sync this state back up to the parent.
    return (
        <Card className="shadow-2xl border-border/50">
             <Tabs defaultValue={activeTool} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="detection" disabled>
                        <Bot className="mr-2 h-4 w-4" />
                        Auto-Detect
                    </TabsTrigger>
                    <TabsTrigger value="digitize" disabled>
                        <PenSquare className="mr-2 h-4 w-4" />
                        Manual
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="detection" asChild>
                    <CardContent className="pt-6 space-y-4">
                         <div className="flex items-start text-sm text-muted-foreground p-3 bg-secondary/30 rounded-md border border-dashed">
                            <MapPin className="h-6 w-6 shrink-0 text-primary mr-3" />
                            <span>
                            Use the <span className="font-semibold text-foreground">Rectangle</span> tool to select an area, or <span className="font-semibold text-foreground">click</span> individual rooftops to guide the AI.
                            </span>
                        </div>
                        <Button
                            onClick={onDetect}
                            disabled={isLoading || !hasSelection}
                            className="w-full h-11 text-base"
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Bot className="mr-2 h-5 w-5" />
                            )}
                            Detect Buildings
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onDownload}
                            disabled={!hasGeoJson || isLoading}
                            className="w-full"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download Detected Data (.zip)
                        </Button>
                    </CardContent>
                </TabsContent>
                <TabsContent value="digitize" asChild>
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start text-sm text-muted-foreground p-3 bg-secondary/30 rounded-md border border-dashed">
                           <PenSquare className="h-6 w-6 shrink-0 text-primary mr-3" />
                           <span>Use the toolbar to draw polygons or lines to manually create features on the map.</span>
                        </div>
                        <Button
                            variant="outline"
                            onClick={onDownloadDigitized}
                            disabled={isLoading || !hasManualFeatures}
                            className="w-full"
                            title={
                                !hasManualFeatures
                                ? 'Draw one or more shapes on the map first'
                                : 'Download your manually drawn shapes'
                            }
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            Download Digitized Layer (.geojson)
                        </Button>
                    </CardContent>
                </TabsContent>
            </Tabs>
        </Card>
    )
}
