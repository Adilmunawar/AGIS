'use client'
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  MousePointer2, Trash2, X, Undo, Redo, UploadCloud, File, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type EditorTool = 'select' | 'delete' | 'undo' | 'redo';

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
                'relative transition-colors duration-200',
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
                             <File className="h-5 w-5"/>
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

export function ParcelEditorDocker({ onUpload, isProcessing, boundaryData, parcelsData, homesData, selectedFeature, onDeleteSelected, onClearData, onFeatureSelect, onToolSelect, onUndo, onRedo, canUndo, canRedo }) {
    
    const visibleColumns = useMemo(() => getVisibleColumns(parcelsData?.features || []), [parcelsData]);
    const selectedRowRef = useRef<HTMLTableRowElement>(null);
    
    useEffect(() => {
        if (selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedFeature]);

    return (
        <div className="w-96 bg-background border-l flex flex-col h-full shadow-2xl">
            <div className="p-3 border-b flex items-center justify-between shrink-0">
                <h3 className="font-bold text-lg text-foreground">Import & Edit</h3>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0">
                <Tabs defaultValue="layers" className="flex-1 flex flex-col min-h-0">
                    <div className="border-b px-2.5">
                        <TabsList className="grid w-full grid-cols-3 h-10">
                            <TabsTrigger value="layers">Layers</TabsTrigger>
                            <TabsTrigger value="attributes" disabled={!parcelsData}>Attributes</TabsTrigger>
                            <TabsTrigger value="tools" disabled={!parcelsData}>Tools</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="layers" className="flex-1 overflow-y-auto p-4 space-y-4 data-[state=inactive]:hidden">
                       <FileUploader layer="boundary" title="Main Boundary" data={boundaryData} onUpload={onUpload} isProcessing={isProcessing['boundary']} />
                       <FileUploader layer="parcels" title="Parcels Layer" data={parcelsData} onUpload={onUpload} isProcessing={isProcessing['parcels']} />
                       <FileUploader layer="homes" title="Homes Layer" data={homesData} onUpload={onUpload} isProcessing={isProcessing['homes']} />
                    </TabsContent>

                    <TabsContent value="attributes" className="flex-1 flex flex-col min-h-0 -mt-0 data-[state=inactive]:hidden">
                       <div className="relative overflow-auto max-h-[calc(100vh-300px)]">
                           <table className="w-max min-w-full text-sm border-collapse">
                               <thead className="sticky top-0 bg-background z-10 shadow-sm">
                                   <tr>
                                       {visibleColumns.map(h => 
                                           <th key={h} className="p-2 font-semibold text-left border-b truncate min-w-[120px]" title={h}>{h}</th>
                                       )}
                                   </tr>
                               </thead>
                               <tbody>
                                   {parcelsData?.features.map((f: any) => (
                                       <tr
                                           key={f.id}
                                           ref={f.id === selectedFeature?.id ? selectedRowRef : null}
                                           onClick={() => onFeatureSelect(f)}
                                           className={cn("cursor-pointer border-b border-border hover:bg-muted/50", f.id === selectedFeature?.id && "bg-primary/10 hover:bg-primary/20")}
                                       >
                                           {visibleColumns.map(h => <td key={h} className="p-2 truncate" title={String(f.properties[h] ?? '')}>{String(f.properties[h] ?? '')}</td>)}
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                    </TabsContent>

                    <TabsContent value="tools" className="flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden">
                       <div className="grid grid-cols-2 gap-2">
                           <Button><MousePointer2 className="mr-2"/> Select Mode</Button>
                           <Button variant="destructive" onClick={onDeleteSelected} disabled={!selectedFeature}><Trash2 className="mr-2"/> Delete Selected</Button>
                           <Button variant="outline" onClick={onClearData}><X className="mr-2"/> Clear All Data</Button>
                           <div/>
                           <Button onClick={onUndo} disabled={!canUndo}><Undo className="mr-2"/> Undo</Button>
                           <Button onClick={onRedo} disabled={!canRedo}><Redo className="mr-2"/> Redo</Button>
                       </div>
                    </TabsContent>
                </Tabs>
            </div>

            <Card className="shrink-0 border-t rounded-t-none border-x-0 border-b-0 max-h-52">
                <CardHeader className="p-3 border-b">
                    <CardTitle className="text-base">Selected Feature</CardTitle>
                </CardHeader>
                <CardContent className="p-3 text-sm overflow-y-auto">
                    {!selectedFeature ? (
                         <p className="text-muted-foreground text-center text-xs pt-4">No feature selected</p>
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
