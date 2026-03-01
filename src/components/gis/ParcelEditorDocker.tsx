'use client'
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import * as turf from '@turf/turf'
import {
  MousePointerSquare, Trash2, X, Undo, Redo, UploadCloud, File as FileIcon, Loader2, Layers, Table, Wrench, Combine, Ruler, Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export type EditorTool = 'select' | 'multi-select';

// Helper to filter out empty/zero columns for a cleaner table view
const getVisibleColumns = (features: any[]) => {
  if (!features || features.length === 0) return [];
  
  const allHeaders = features.reduce((acc, f) => {
    if (f.properties) {
      Object.keys(f.properties).forEach(key => acc.add(key));
    }
    return acc;
  }, new Set<string>());

  return Array.from(allHeaders).filter(columnName => {
    return !features.every(feature => {
      const value = feature.properties?.[columnName];
      return value === null || value === undefined || value === '' || String(value).trim() === '0';
    });
  });
};

const FileUploader = ({ layer, title, data, onUpload, isProcessing }: { layer: 'boundary' | 'parcels' | 'homes', title: string, data: any, onUpload: (files: File[], layer: 'boundary' | 'parcels' | 'homes') => void, isProcessing: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((event: React.DragEvent, type: 'enter' | 'leave' | 'over') => {
        event.preventDefault();
        event.stopPropagation();
        if (type === 'enter' || type === 'over') setIsDragging(true);
        else setIsDragging(false);
    }, []);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) {
            onUpload(Array.from(event.dataTransfer.files), layer);
        }
    }, [onUpload, layer]);

    return (
        <Card 
            className={cn(
                'relative transition-colors duration-200 cursor-pointer',
                isDragging ? 'border-primary bg-primary/10' : 'bg-background',
                data && 'bg-green-50 border-green-200'
            )}
            onDragEnter={(e) => handleDrag(e, 'enter')}
            onDragLeave={(e) => handleDrag(e, 'leave')}
            onDragOver={(e) => handleDrag(e, 'over')}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                multiple
                accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.fbn,.fbx,.ain,.aih,.ixs,.mxs,.atx,.cpg,.xml"
                onChange={(e) => e.target.files && onUpload(Array.from(e.target.files), layer)}
            />
             <CardContent className="p-4">
                <div className="flex items-center justify-between">
                     <h4 className="font-semibold">{title}</h4>
                     {data && <Badge variant="secondary">{data.features.length} Features</Badge>}
                </div>
                <div className="flex flex-col items-center justify-center p-4 mt-2 border-2 border-dashed rounded-lg text-muted-foreground">
                    {isProcessing ? (
                         <>
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="mt-2 font-semibold">Processing...</p>
                        </>
                    ) : data ? (
                         <div className="flex items-center gap-2 text-green-700">
                             <FileIcon className="h-5 w-5"/>
                             <span className="text-sm font-medium">Loaded</span>
                         </div>
                    ) : (
                         <>
                            <UploadCloud className="h-8 w-8" />
                            <p className="mt-2 text-xs text-center">
                                {isDragging ? "Drop files here" : "Drag & drop or click"}
                            </p>
                        </>
                    )}
                </div>
             </CardContent>
        </Card>
    );
};

export function ParcelEditorDocker({ onUpload, isProcessing, boundaryData, parcelsData, homesData, selectedFeatureIds, onDeleteSelected, onClearData, onFeatureSelect, onExportGeoJSON, activeTool, onToolSelect, onUndo, onRedo, canUndo, canRedo, onMerge }) {
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);

    const sortedParcels = useMemo(() => {
        if (!parcelsData?.features) return [];
        const features = [...parcelsData.features];
        if (sortConfig !== null) {
            features.sort((a, b) => {
                const aVal = a.properties[sortConfig.key];
                const bVal = b.properties[sortConfig.key];
                if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
                    return sortConfig.direction === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
                }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return features;
    }, [parcelsData, sortConfig]);


    const visibleColumns = useMemo(() => getVisibleColumns(parcelsData?.features || []), [parcelsData]);
    const selectedRowRef = useRef<HTMLTableRowElement>(null);
    
    useEffect(() => {
        if (selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedFeatureIds]);
    
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleMeasureArea = () => {
        if (selectedFeatureIds.length !== 1 || !parcelsData) return;
        const feature = parcelsData.features.find((f: any) => f.id === selectedFeatureIds[0]);
        if (!feature) return;

        const areaSqm = turf.area(feature);
        const areaAcres = areaSqm * 0.000247105;
        
        toast({
            title: "Area Measurement",
            description: `Area: ${areaSqm.toFixed(2)} sq. meters (${areaAcres.toFixed(4)} acres)`
        })
    }

    const selectedFeature = useMemo(() => {
        if (selectedFeatureIds.length !== 1) return null;
        return parcelsData?.features.find((f: any) => f.id === selectedFeatureIds[0]);
    }, [parcelsData, selectedFeatureIds]);

    return (
        <div className="w-[450px] bg-background border-l flex flex-col h-full shadow-2xl">
            <div className="p-3 border-b flex items-center justify-between shrink-0">
                <h3 className="font-bold text-lg text-foreground">Parcel Editor</h3>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0">
                <Tabs defaultValue="layers" className="flex-1 flex flex-col min-h-0">
                    <div className="border-b px-2.5">
                        <TabsList className="grid w-full grid-cols-3 h-10">
                            <TabsTrigger value="layers"><Layers className="w-4 h-4 mr-1.5"/>Layers</TabsTrigger>
                            <TabsTrigger value="table" disabled={!parcelsData}><Table className="w-4 h-4 mr-1.5"/>Table</TabsTrigger>
                            <TabsTrigger value="tools" disabled={!parcelsData}><Wrench className="w-4 h-4 mr-1.5"/>Tools</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="layers" className="flex-1 overflow-y-auto p-4 space-y-4 data-[state=inactive]:hidden">
                       <FileUploader layer="boundary" title="Main Boundary" data={boundaryData} onUpload={onUpload} isProcessing={isProcessing['boundary']} />
                       <FileUploader layer="parcels" title="Parcels Layer" data={parcelsData} onUpload={onUpload} isProcessing={isProcessing['parcels']} />
                       <FileUploader layer="homes" title="Homes Layer" data={homesData} onUpload={onUpload} isProcessing={isProcessing['homes']} />
                    </TabsContent>

                    <TabsContent value="table" className="flex-1 flex flex-col min-h-0 -mt-0 data-[state=inactive]:hidden">
                       <div className="relative overflow-auto max-h-[calc(100vh-300px)]">
                           <table className="w-max min-w-full text-sm border-collapse">
                               <thead className="sticky top-0 bg-background z-10 shadow-sm">
                                   <tr>
                                       {visibleColumns.map(h => 
                                           <th key={h} className="p-2 font-semibold text-left border-b truncate min-w-[120px] cursor-pointer" title={h} onClick={() => requestSort(h)}>
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
                                           ref={selectedFeatureIds.includes(f.id) && selectedFeatureIds.length === 1 && f.id === selectedFeatureIds[0] ? selectedRowRef : null}
                                           onClick={() => onFeatureSelect(f)}
                                           className={cn("cursor-pointer border-b border-border hover:bg-muted/50", selectedFeatureIds.includes(f.id) && "bg-primary/10 hover:bg-primary/20")}
                                       >
                                           {visibleColumns.map(h => <td key={h} className="p-2 truncate" title={String(f.properties[h] ?? '')}>{String(f.properties[h] ?? '')}</td>)}
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                    </TabsContent>

                    <TabsContent value="tools" className="flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden">
                       <div className="grid grid-cols-2 gap-3">
                           <Button variant={activeTool === 'multi-select' ? 'default' : 'outline'} onClick={() => onToolSelect(activeTool === 'select' ? 'multi-select' : 'select')}><MousePointerSquare className="mr-2"/> Multi-Select</Button>
                           <Button variant="outline" onClick={onMerge} disabled={selectedFeatureIds.length < 2}><Combine className="mr-2"/> Merge Parcels</Button>
                           <Button variant="outline" onClick={handleMeasureArea} disabled={selectedFeatureIds.length !== 1}><Ruler className="mr-2"/> Measure Area</Button>
                           <Button variant="outline" onClick={onExportGeoJSON} disabled={!parcelsData}><Download className="mr-2"/> Export GeoJSON</Button>
                           <Button variant="destructive" onClick={onDeleteSelected} disabled={selectedFeatureIds.length === 0}><Trash2 className="mr-2"/> Delete Selected</Button>
                           <Button variant="destructive" outline onClick={onClearData}><X className="mr-2"/> Clear All Data</Button>
                           <Button variant="outline" onClick={onUndo} disabled={!canUndo}><Undo className="mr-2"/> Undo</Button>
                           <Button variant="outline" onClick={onRedo} disabled={!canRedo}><Redo className="mr-2"/> Redo</Button>
                       </div>
                    </TabsContent>
                </Tabs>
            </div>

            <Card className="shrink-0 border-t rounded-t-none border-x-0 border-b-0 max-h-52">
                <CardHeader className="p-3 border-b">
                    <CardTitle className="text-base">
                        {selectedFeatureIds.length > 1 
                            ? `${selectedFeatureIds.length} Features Selected`
                            : "Selected Feature"
                        }
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 text-sm overflow-y-auto">
                    {!selectedFeature ? (
                         <p className="text-muted-foreground text-center text-xs pt-4">
                            {selectedFeatureIds.length > 1 ? `Click a single feature to see its properties.` : `No feature selected`}
                         </p>
                    ) : (
                        <div className="space-y-1.5">
                            {Object.entries(selectedFeature.properties).map(([key, value]) => (
                                <div key={key} className="grid grid-cols-2 gap-2 items-center">
                                    <span className="font-medium text-muted-foreground truncate" title={key}>{key}</span>
                                    <span className="bg-muted/50 px-2 py-0.5 text-xs rounded-md truncate" title={String(value)}>{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
