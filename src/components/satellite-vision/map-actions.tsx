'use client';

import * as React from 'react';
import { Bot, Download, Loader2, FileDown, Minus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ActiveTool } from './controls-sidebar';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

type MapActionsProps = {
    activeTool: ActiveTool;
    isLoading: boolean;
    hasSelection: boolean;
    hasGeoJson: boolean;
    hasManualFeatures: boolean;
    onDetect: () => void;
    onDownload: () => void;
    onDownloadDigitized: () => void;
    drawColor: string;
    setDrawColor: (color: string) => void;
    lineStyle: 'solid' | 'dashed';
    setLineStyle: (style: 'solid' | 'dashed') => void;
}

const COLOR_PALETTE = [
  { name: 'Green', value: 'hsl(var(--primary))' },
  { name: 'Red', value: 'hsl(var(--destructive))' },
  { name: 'Blue', value: 'hsl(var(--chart-2))' },
  { name: 'Yellow', value: 'hsl(var(--chart-3))' },
  { name: 'Purple', value: 'hsl(var(--chart-5))' },
];


function ActionButton({ tooltip, children, ...props }: { tooltip: string, children: React.ReactNode, [key: string]: any }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-md"
                        {...props}
                    >
                        {children}
                    </Button>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
                <p>{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    )
}

export function MapActions({
    activeTool,
    isLoading,
    hasSelection,
    hasGeoJson,
    hasManualFeatures,
    onDetect,
    onDownload,
    onDownloadDigitized,
    drawColor,
    setDrawColor,
    lineStyle,
    setLineStyle,
}: MapActionsProps) {

    const showDetection = activeTool === 'detection';
    const showDigitize = activeTool === 'digitize';
    const showActions = showDetection || showDigitize;

    if (!showActions) {
        return null;
    }

    // This component now renders its own toolbar container.
    // It's designed to be portaled into the main leaflet-draw container.
    return (
        <div className={cn(
            "leaflet-bar leaflet-draw-toolbar", // Use same classes for consistent styling
            "mt-0 flex-col", // Remove top margin and ensure column layout
        )}>
            <TooltipProvider>
                <div className="flex flex-col items-center gap-1">
                    {showDetection && (
                        <>
                           <Separator className="my-1 bg-border/50 w-full" />
                            <ActionButton
                                onClick={onDetect}
                                disabled={isLoading || !hasSelection}
                                tooltip={hasSelection ? 'Run AI Detection' : 'Select an area first'}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Bot className="h-4 w-4" />
                                )}
                                <span className="sr-only">Detect Buildings</span>
                            </ActionButton>
                            <ActionButton
                                onClick={onDownload}
                                disabled={!hasGeoJson || isLoading}
                                tooltip={hasGeoJson ? 'Download Detected Data (.zip)' : 'No detection data to download'}
                            >
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Download Detected Data</span>
                            </ActionButton>
                        </>
                    )}
                    {showDigitize && (
                         <>
                            <Separator className="my-1 bg-border/50 w-full" />
                            <ActionButton
                                onClick={onDownloadDigitized}
                                disabled={isLoading || !hasManualFeatures}
                                tooltip={hasManualFeatures ? 'Download Digitized Layer (.geojson)' : 'Draw features to download'}
                            >
                                <FileDown className="h-4 w-4" />
                                <span className="sr-only">Download Digitized Layer</span>
                            </ActionButton>

                             <Separator className="my-1 bg-border/50 w-full" />
                            
                            <div className="flex flex-col items-center gap-1 p-1">
                                {COLOR_PALETTE.map((color) => (
                                   <Tooltip key={color.name}>
                                    <TooltipTrigger asChild>
                                       <button
                                        onClick={() => setDrawColor(color.value)}
                                        className={cn(
                                            'h-6 w-6 rounded-full border-2 transition-all',
                                            drawColor === color.value
                                            ? 'border-ring scale-110'
                                            : 'border-transparent hover:scale-110'
                                        )}
                                        style={{ backgroundColor: color.value }}
                                        aria-label={`Set color to ${color.name}`}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={10}><p>{color.name}</p></TooltipContent>
                                   </Tooltip>
                                ))}
                            </div>

                            <Separator className="my-1 bg-border/50 w-full" />

                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                    <Button
                                        variant={lineStyle === 'solid' ? 'secondary' : 'ghost'}
                                        onClick={() => setLineStyle('solid')}
                                        className="h-8 w-8"
                                        size="icon"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={10}><p>Solid Line</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                    <Button
                                        variant={lineStyle === 'dashed' ? 'secondary' : 'ghost'}
                                        onClick={() => setLineStyle('dashed')}
                                        className="h-8 w-8"
                                        size="icon"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={10}><p>Dashed Line</p></TooltipContent>
                            </Tooltip>
                        </>
                    )}
                </div>
            </TooltipProvider>
        </div>
    )
}
