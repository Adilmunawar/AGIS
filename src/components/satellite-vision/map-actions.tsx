'use client';

import * as React from 'react';
import { Bot, Download, Loader2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-2">
                {activeTool === 'detection' && (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-12 w-12 rounded-lg shadow-lg"
                                        onClick={onDetect}
                                        disabled={isLoading || !hasSelection}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        ) : (
                                            <Bot className="h-6 w-6" />
                                        )}
                                        <span className="sr-only">Detect Buildings</span>
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" sideOffset={10}>
                                <p>{hasSelection ? 'Run AI Detection' : 'Select an area first'}</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-12 w-12 rounded-lg shadow-lg"
                                        onClick={onDownload}
                                        disabled={!hasGeoJson || isLoading}
                                    >
                                        <Download className="h-6 w-6" />
                                        <span className="sr-only">Download Detected Data</span>
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" sideOffset={10}>
                                <p>{hasGeoJson ? 'Download Detected Data (.zip)' : 'No detection data to download'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
                {activeTool === 'digitize' && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-12 w-12 rounded-lg shadow-lg"
                                    onClick={onDownloadDigitized}
                                    disabled={isLoading || !hasManualFeatures}
                                >
                                    <FileDown className="h-6 w-6" />
                                    <span className="sr-only">Download Digitized Layer</span>
                                </Button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" sideOffset={10}>
                            <p>{hasManualFeatures ? 'Download Digitized Layer (.geojson)' : 'Draw features to download'}</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </TooltipProvider>
    )
}
