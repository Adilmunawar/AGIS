'use client'
import React from 'react'
import {
  MousePointer, Edit3, PenSquare, Scissors, Combine, Trash2, Undo, Redo,
  Ruler, CircleDot, Magnet, Table, FileJson, Settings, Download, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'


const PropertiesPanel = ({ feature, parcelsCount, onDeleteClick }: { feature: any, parcelsCount: number, onDeleteClick: () => void }) => (
    <ScrollArea className="h-full">
        <div className="p-4 text-sm">
             {parcelsCount > 0 && (
                <div className="mb-4">
                    <h4 className="font-semibold mb-2">Layer Summary</h4>
                    <div className="grid grid-cols-2 gap-2 items-center bg-muted/50 p-3 rounded-md">
                        <span className="font-medium text-muted-foreground">Total Parcels</span>
                        <span className="font-bold text-lg text-right text-primary">{parcelsCount.toLocaleString()}</span>
                    </div>
                </div>
            )}
            
            <Separator className={cn(parcelsCount === 0 && 'hidden', 'mb-4')}/>

            {!feature ? (
                <div className="text-center text-muted-foreground h-full flex items-center justify-center p-8">
                    <p>Select a parcel on the map or from the table to view its properties.</p>
                </div>
            ) : (
                <div className="space-y-4">
                     <div>
                        <h4 className="font-semibold mb-2 text-primary break-all">Feature ID: {feature.id}</h4>
                    </div>
                    <Separator/>
                    <h4 className="font-semibold mb-2">Attributes</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {Object.entries(feature.properties).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-2 gap-2 items-center">
                                <span className="font-medium text-muted-foreground truncate" title={key}>{key}</span>
                                <span className="bg-muted/50 px-2 py-1 rounded-md truncate" title={String(value)}>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                    <Separator />
                    <Button variant="destructive" className="w-full" onClick={onDeleteClick}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected Parcel
                    </Button>
                </div>
            )}
        </div>
    </ScrollArea>
);

const AttributeTable = ({ features, selectedId, onRowClick }: { features: any[], selectedId: string | number | null, onRowClick: (feature: any) => void }) => {
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const selectedRowRef = React.useRef<HTMLTableRowElement>(null);
    
    // Scroll to selected row
    React.useEffect(() => {
        if (selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [selectedId]);
    
    if (!features || features.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No parcel data loaded.</div>
    }

    const headers = Object.keys(features[0].properties);

    return (
        <div ref={tableContainerRef} className="relative h-full w-full overflow-y-auto">
            <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-secondary z-10 shadow-sm">
                    <tr>
                        <th className="p-2 font-semibold text-left border-b">ID</th>
                        {headers.map(h => <th key={h} className="p-2 font-semibold text-left border-b truncate" title={h}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {features.map(f => (
                        <tr
                            key={f.id}
                            ref={f.id === selectedId ? selectedRowRef : null}
                            onClick={() => onRowClick(f)}
                            className={cn("cursor-pointer border-b border-border hover:bg-muted/50", f.id === selectedId && "bg-primary/10 hover:bg-primary/20")}
                        >
                            <td className="p-2 font-medium break-all">{f.id}</td>
                            {headers.map(h => <td key={h} className="p-2 truncate" title={String(f.properties[h])}>{String(f.properties[h])}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const ExportPanel = ({ hasData, onExportGeoJSON }: { hasData: boolean, onExportGeoJSON: () => void }) => (
     <div className="p-4 space-y-4">
        <h4 className="font-semibold">Export Data</h4>
        <p className="text-sm text-muted-foreground">
            Export the modified parcel data to a standard file format.
        </p>
        <Button disabled={!hasData} className="w-full" onClick={onExportGeoJSON}>
            <Download className="mr-2 h-4 w-4" /> Export to GeoJSON
        </Button>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                     <span tabIndex={0} className="w-full inline-block">
                        <Button disabled={true} className="w-full">
                            <Download className="mr-2 h-4 w-4" /> Export to Shapefile
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent><p>Shapefile export is a future enhancement.</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
)


export function ParcelEditorDocker({ selectedFeature, allFeatures, onDeleteSelected, hasData, onClearData, onFeatureSelect, onExportGeoJSON }: {
    selectedFeature: any | null;
    allFeatures: any[];
    onDeleteSelected: () => void;
    hasData: boolean;
    onClearData: () => void;
    onFeatureSelect: (feature: any) => void;
    onExportGeoJSON: () => void;
}) {
    return (
        <div className="w-96 bg-background border-l flex flex-col h-full shadow-2xl">
            <div className="p-3 border-b flex items-center justify-between shrink-0">
                <h3 className="font-bold text-lg text-foreground">Parcel Editor</h3>
                {hasData && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearData}>
                                    <X className="h-4 w-4 text-destructive" />
                                </Button>
                            </TooltipTrigger>
                             <TooltipContent side="bottom"><p>Clear All Data & Start Over</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            <div className="flex flex-1 min-h-0">
                <div className="flex-1 flex flex-col min-w-0">
                     <Tabs defaultValue="properties" className="flex-1 flex flex-col min-h-0">
                        <div className="border-b p-2">
                            <TabsList className="grid w-full grid-cols-3 h-9">
                                <TabsTrigger value="properties" disabled={!hasData}>Properties</TabsTrigger>
                                <TabsTrigger value="table" disabled={!hasData}>Table</TabsTrigger>
                                <TabsTrigger value="export" disabled={!hasData}>Export</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="properties" className="flex-1 min-h-0 -mt-0 data-[state=inactive]:hidden">
                             <PropertiesPanel feature={selectedFeature} parcelsCount={allFeatures.length} onDeleteClick={onDeleteSelected} />
                        </TabsContent>
                        <TabsContent value="table" className="flex-1 min-h-0 -mt-0 data-[state=inactive]:hidden">
                             <AttributeTable features={allFeatures} selectedId={selectedFeature?.id} onRowClick={onFeatureSelect} />
                        </TabsContent>
                        <TabsContent value="export" className="flex-1 min-h-0 -mt-0 data-[state=inactive]:hidden">
                             <ExportPanel hasData={hasData} onExportGeoJSON={onExportGeoJSON} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
