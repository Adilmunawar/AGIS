'use client'
import React, { useMemo, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import * as turf from '@turf/turf'
import JSZip from 'jszip'
import {
  Layers, Table as TableIcon, UploadCloud, CheckCircle, Loader2, X, Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGisData } from '@/context/GisDataContext'

const LayerPreviewMap = dynamic(() => import('./LayerPreviewMap'), { ssr: false });

const FileUploader = ({ layer, title, data, onUpload, isProcessing, onClear }: any) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) onUpload(Array.from(event.dataTransfer.files), layer);
    }, [onUpload, layer]);

    return (
        <Card
            className={cn('relative transition-all duration-200 shadow-sm', !data && 'hover:shadow-md', isDragging && 'ring-2 ring-primary')}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDrop={handleDrop}
            onClick={() => document.getElementById(`file-input-${layer}`)?.click()}
        >
            <input
                id={`file-input-${layer}`}
                type="file"
                className="hidden"
                multiple
                accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.cpg,.xml"
                onChange={(e) => e.target.files && onUpload(Array.from(e.target.files), layer)}
                disabled={isProcessing}
            />
             <CardContent className="p-2 space-y-2 cursor-pointer">
                <div className="flex items-center justify-between px-1">
                     <h4 className="font-semibold text-xs">{title}</h4>
                     {data && (
                        <div className="flex items-center gap-1.5 z-20 relative">
                            <Badge variant="secondary" className="flex items-center gap-1.5 pl-2">
                                <CheckCircle className="h-3.5 w-3.5 text-green-500"/> 
                                {data.features.length} Features
                            </Badge>
                            <button onClick={(e) => { e.stopPropagation(); onClear(layer); }} className="p-1 rounded-full hover:bg-destructive/10 text-destructive/70 hover:text-destructive cursor-pointer">
                                <X className="h-3.5 w-3.5"/>
                            </button>
                        </div>
                     )}
                </div>
                 <div
                    className={cn(
                        "flex flex-col items-center justify-center border-2 rounded-lg text-muted-foreground transition-colors h-[140px] overflow-hidden",
                        isDragging ? "bg-primary/10 border-primary border-dashed" : "bg-background",
                        data ? 'p-0 border-solid border-border' : 'p-4 border-dashed hover:bg-muted/50'
                    )}
                 >
                    {isProcessing ? (
                         <div className="h-full w-full flex flex-col items-center justify-center bg-secondary/50">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                            <p className="mt-2 font-semibold text-xs">Processing...</p>
                        </div>
                    ) : data ? (
                        <div className='h-full w-full rounded-md pointer-events-none'>
                            <LayerPreviewMap
                                data={data}
                                color={layer === 'boundary' ? "#dc2626" : "#2563eb"}
                            />
                        </div>
                    ) : (
                         <>
                            <UploadCloud className="h-6 w-6" />
                            <p className="mt-2 text-xs text-center font-semibold">Drag & drop or click</p>
                        </>
                    )}
                </div>
             </CardContent>
        </Card>
    );
};

const getVisibleColumns = (features: any[]) => {
  if (!features || features.length === 0) return [];
  const allHeaders = features.reduce((acc, f) => {
    if (f.properties) Object.keys(f.properties).forEach(key => acc.add(key));
    return acc;
  }, new Set<string>());
  return Array.from(allHeaders);
};

export type EditorTool = 'select' | 'multi-select';

export function ParcelEditorDocker({ onUpload, isProcessing, boundaryData, parcelsData, homesData, selectedFeatureIds, onFeatureSelect }: any) {
    const { updateToolState } = useGisData();
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
    const { toast } = useToast();

    const handleSaveLocally = async () => {
        if (!boundaryData && !parcelsData) {
            toast({
                variant: 'destructive',
                title: 'No Data to Save',
                description: 'Please upload at least one layer to save.',
            });
            return;
        }

        try {
            const zip = new JSZip();

            if (boundaryData) {
                zip.file('boundary.geojson', JSON.stringify(boundaryData));
            }
            if (parcelsData) {
                zip.file('parcels.geojson', JSON.stringify(parcelsData));
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'AGIS_layers.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast({
                title: 'Download Started',
                description: 'Zipped layers are downloading.',
            });

        } catch (error) {
            console.error("Error creating zip file:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not create the zip file.',
            });
        }
    }

    const sortedParcels = useMemo(() => {
        if (!parcelsData?.features) return [];
        let features = [...parcelsData.features];
        if (sortConfig !== null) {
            features.sort((a, b) => {
                const aVal = a.properties[sortConfig.key];
                const bVal = b.properties[sortConfig.key];
                const aNum = Number(aVal);
                const bNum = Number(bVal);
                if (!isNaN(aNum) && !isNaN(bNum)) return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return features;
    }, [parcelsData, sortConfig]);

    const visibleColumns = useMemo(() => getVisibleColumns(parcelsData?.features || []), [parcelsData]);
    
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const handleClearLayer = useCallback((layerToClear: 'boundary' | 'parcels') => {
        const updates: any = {};
        if (layerToClear === 'boundary') updates.boundaryData = null;
        else if (layerToClear === 'parcels') { updates.parcelsData = null; updates.selectedFeatureIds = []; }
        updateToolState('importParcels', updates);
    }, [updateToolState]);

    const selectedFeature = useMemo(() => {
        if (selectedFeatureIds.length !== 1) return null;
        return parcelsData?.features.find((f: any) => f.id === selectedFeatureIds[0]);
    }, [parcelsData, selectedFeatureIds]);

    const selectedFeatureDetails = useMemo(() => {
        if (!selectedFeature) return null;
        try {
            const areaSqm = turf.area(selectedFeature);
            return { ...selectedFeature.properties, "Area (sq. m)": areaSqm.toFixed(2), "Area (acres)": (areaSqm * 0.000247105).toFixed(4) };
        } catch { return selectedFeature.properties; }
    }, [selectedFeature]);

    return (
        <div className="flex flex-col h-full w-[350px] overflow-hidden">
            <div className="p-2 border-b flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-xs text-foreground">Parcel Editor</h3>
            </div>
            
             <Tabs defaultValue="layers" className="flex flex-col flex-1 h-full w-full min-h-0">
                 <div className="border-b p-2 bg-background">
                    <TabsList className="grid w-full grid-cols-2 h-7">
                        <TabsTrigger 
                            value="layers" 
                            className="text-xs h-full data-[state=inactive]:hover:bg-muted/50 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm rounded-md"
                        >
                            <Layers className="size-3 mr-1.5"/>Layers
                        </TabsTrigger>
                        <TabsTrigger 
                            value="table" 
                            className="text-xs h-full data-[state=inactive]:hover:bg-muted/50 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm rounded-md"
                            disabled={!parcelsData}
                        >
                            <TableIcon className="size-3 mr-1.5"/>Table
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="layers" className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                    <FileUploader layer="boundary" title="Main Boundary" data={boundaryData} onUpload={onUpload} isProcessing={isProcessing['boundary']} onClear={handleClearLayer} />
                    <FileUploader layer="parcels" title="Parcels Layer" data={parcelsData} onUpload={onUpload} isProcessing={isProcessing['parcels']} onClear={handleClearLayer} />
                </TabsContent>

                <TabsContent value="table" className="flex-1 min-h-0 overflow-auto p-1">
                     <div className="h-full">
                        <table className="w-max min-w-full text-[9px] border-collapse">
                            <thead className="sticky top-0 bg-background z-10 shadow-sm">
                                <tr>
                                    {visibleColumns.map(h => 
                                        <th key={h} className="p-1 font-semibold text-left border-b truncate min-w-[60px] cursor-pointer" title={h} onClick={() => requestSort(h)}>
                                            <div className="flex items-center gap-1">
                                                {h}
                                                {sortConfig?.key === h && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </div>
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedParcels.map((f: any) => (
                                    <tr
                                        key={f.id}
                                        onClick={() => onFeatureSelect(f)}
                                        className={cn("cursor-pointer border-b border-border hover:bg-muted/50", selectedFeatureIds.includes(f.id) && "bg-primary/10 hover:bg-primary/20")}
                                    >
                                        {visibleColumns.map(h => <td key={h} className="p-1 truncate max-w-[100px]" title={String(f.properties[h] ?? '')}>{String(f.properties[h] ?? '')}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
            </Tabs>
            
            <div className="shrink-0 border-y p-2 flex items-center gap-2">
                <Button onClick={handleSaveLocally} className="w-full" variant="outline" disabled={!boundaryData && !parcelsData}>
                    <Download className="mr-2 h-4 w-4" />
                    Save Locally
                </Button>
                <Button className="w-full" variant="secondary" disabled>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload to Cloud
                </Button>
            </div>

            <Card className="shrink-0 border-x-0 border-b-0 rounded-none max-h-[14rem]">
                <CardHeader className="p-1.5 border-b">
                    <CardTitle className="text-[10px] font-bold px-1">
                        {selectedFeatureIds.length > 1 
                            ? `${selectedFeatureIds.length} Features Selected`
                            : "Selected Feature Details"
                        }
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2 text-[10px] overflow-y-auto">
                    {!selectedFeatureDetails ? (
                         <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] pt-4">
                            <p>
                                {selectedFeatureIds.length > 1 ? `Click a single feature to see its properties.` : `No feature selected`}
                            </p>
                         </div>
                    ) : (
                        <div className="space-y-0.5">
                            {Object.entries(selectedFeatureDetails).map(([key, value]) => (
                                <div key={key} className="leading-tight flex">
                                    <span className="font-semibold text-muted-foreground/90 w-2/5 truncate pr-2">{key}:</span>
                                    <span className="text-foreground font-medium break-words w-3/5">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
