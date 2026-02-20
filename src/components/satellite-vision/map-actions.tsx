'use client';

import * as React from 'react';
import { Bot, Download, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

    if (activeTool === 'detection') {
        return (
            <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2 w-full max-w-xs">
                <div className="flex items-center justify-center gap-2 rounded-lg bg-background/90 p-3 text-sm text-muted-foreground shadow-lg backdrop-blur-sm border">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span>
                    Draw a rectangle or click rooftops to select an area.
                    </span>
                </div>
                <Button
                    onClick={onDetect}
                    disabled={isLoading || !hasSelection}
                    className="h-12 text-base shadow-lg"
                    size="lg"
                >
                    {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <Bot className="mr-2 h-5 w-5" />
                    )}
                    Detect Buildings
                </Button>
                <Button
                    variant="secondary"
                    onClick={onDownload}
                    disabled={!hasGeoJson || isLoading}
                    className="shadow-lg"
                >
                    <Download className="mr-2 h-4 w-4" />
                    Download Detected Data (.zip)
                </Button>
            </div>
        )
    }

    if (activeTool === 'digitize') {
        return (
             <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2 w-full max-w-xs">
                <Button
                    variant="secondary"
                    onClick={onDownloadDigitized}
                    disabled={isLoading || !hasManualFeatures}
                    className="shadow-lg"
                    title={
                        !hasManualFeatures
                        ? 'Draw one or more shapes on the map first'
                        : 'Download your manually drawn shapes'
                    }
                >
                    <Download className="mr-2 h-4 w-4" />
                    Download Digitized Layer (.geojson)
                </Button>
            </div>
        )
    }

    return null;
}
