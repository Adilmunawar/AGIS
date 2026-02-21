'use client';

import * as React from 'react';
import { Bot, Download, Loader2, FileDown, Minus, MoreHorizontal, Brush } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ActiveTool } from './controls-sidebar';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

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
                {/* Use a plain button that will be styled by globals.css to match leaflet's <a> tags */}
                <button
                    className="map-action-button"
                    {...props}
                >
                    {children}
                </button>
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

    const actionTools = (
        <div className="leaflet-draw-section">
            <div className="leaflet-draw-toolbar leaflet-bar">
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
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="relative">
                                    <ActionButton tooltip="Drawing Styles">
                                        <Brush className="h-4 w-4" />
                                        <span 
                                            className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-card"
                                            style={{ backgroundColor: drawColor }}
                                        />
                                    </ActionButton>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent side="right" sideOffset={10} className="w-auto p-2">
                                <div className="space-y-4">
                                    <div>
                                        <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Color</p>
                                        <div className="flex items-center gap-1 p-1">
                                            {COLOR_PALETTE.map((color) => (
                                            <Tooltip key={color.name}>
                                                <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => setDrawColor(color.value)}
                                                    className={cn(
                                                        'h-7 w-7 rounded-full border-2 transition-all',
                                                        drawColor === color.value
                                                        ? 'border-primary scale-110'
                                                        : 'border-transparent hover:scale-110'
                                                    )}
                                                    style={{ backgroundColor: color.value }}
                                                    aria-label={`Set color to ${color.name}`}
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" sideOffset={5}><p>{color.name}</p></TooltipContent>
                                            </Tooltip>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Line Style</p>
                                        <div className="flex items-center gap-1 p-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div>
                                                    <Button
                                                        variant={lineStyle === 'solid' ? 'secondary' : 'ghost'}
                                                        onClick={() => setLineStyle('solid')}
                                                        className="h-9 w-9"
                                                        size="icon"
                                                    >
                                                        <Minus className="h-5 w-5" />
                                                    </Button>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" sideOffset={5}><p>Solid</p></TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div>
                                                    <Button
                                                        variant={lineStyle === 'dashed' ? 'secondary' : 'ghost'}
                                                        onClick={() => setLineStyle('dashed')}
                                                        className="h-9 w-9"
                                                        size="icon"
                                                    >
                                                        <MoreHorizontal className="h-5 w-5" />
                                                    </Button>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" sideOffset={5}><p>Dashed</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </>
                )}
            </div>
        </div>
    );
    
    if (!showDetection && !showDigitize) {
        return null;
    }
    
    return <TooltipProvider>{actionTools}</TooltipProvider>;
}
