'use client'
import React, { useCallback, useState } from 'react'
import {
  MousePointer, Edit3, PenSquare, Scissors, Combine, Trash2, Undo, Redo,
  Ruler, CircleDot, Magnet, Download, X, RectangleHorizontal, MinusSquare, Home, UploadCloud, File, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

export type EditorTool = 'select' | 'clear-selection' | 'edit-vertices' | 'draw-polygon' | 'draw-rectangle' | 'delete' | 'split' | 'merge' | 'undo' | 'redo' | 'measure' | 'snap-vertex' | 'snap-edge';

const PropertiesPanel = ({ feature, parcelsCount, homesCount, onDeleteClick }: { feature: any, parcelsCount: number, homesCount: number, onDeleteClick: () => void }) => (
    <div className="p-4 text-sm h-full flex flex-col">
         {(parcelsCount > 0 || homesCount > 0) && (
            <div className="mb-4">
                <h4 className="font-semibold mb-2">Boundary Summary</h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 items-center bg-muted/50 p-3 rounded-md">
                    <div className='flex items-center gap-2 font-medium text-muted-foreground'>
                      <Home className="h-4 w-4"/>
                      <span>Total Parcels</span>
                    </div>
                    <span className="font-bold text-lg text-right text-primary">{parcelsCount.toLocaleString()}</span>
                    <div className='flex items-center gap-2 font-medium text-muted-foreground'>
                      <Home className="h-4 w-4"/>
                      <span>Total Homes</span>
                    </div>
                    <span className="font-bold text-lg text-right text-green-600">{homesCount.toLocaleString()}</span>
                </div>
            </div>
        )}
        
        <Separator className={cn(parcelsCount === 0 && homesCount === 0 && 'hidden', 'mb-4')}/>

        {!feature ? (
            <div className="text-center text-muted-foreground flex-1 flex items-center justify-center p-8">
                <p>Select a parcel or home on the map to view its properties.</p>
            </div>
        ) : (
            <div className="space-y-4">
                 <div>
                    <h4 className="font-semibold mb-2 text-primary break-all">Feature ID: {feature.id}</h4>
                </div>
                <Separator/>
                <h4 className="font-semibold mb-2">Attributes</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {Object.keys(feature.properties).length > 0 ? (
                         Object.entries(feature.properties).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-2 gap-2 items-center">
                                <span className="font-medium text-muted-foreground truncate" title={key}>{key}</span>
                                <span className="bg-muted/50 px-2 py-1 rounded-md truncate" title={String(value)}>{String(value)}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-xs">No attributes found for this feature.</p>
                    )}
                </div>
                <Separator />
                <Button variant="destructive" className="w-full" onClick={onDeleteClick}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected Feature
                </Button>
            </div>
        )}
    </div>
);

const AttributeTable = ({ features, selectedId, onRowClick }: { features: any[], selectedId: string | number | null, onRowClick: (feature: any) => void }) => {
    const selectedRowRef = React.useRef<HTMLTableRowElement>(null);
    
    React.useEffect(() => {
        if (selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedId]);
    
    if (!features || features.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No parcel data loaded.</div>
    }

    const allHeaders = features.reduce((acc, f) => {
        if (f.properties) {
          Object.keys(f.properties).forEach(key => acc.add(key));
        }
        return acc;
    }, new Set<string>());

    const headers = Array.from(allHeaders);

    return (
        <div className="relative h-full w-full overflow-auto max-w-full">
            <table className="w-max min-w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-secondary z-10 shadow-sm">
                    <tr>
                        <th className="p-2 font-semibold text-left border-b">ID</th>
                        {headers.map(h => <th key={h} className="p-2 font-semibold text-left border-b truncate min-w-[120px]" title={h}>{h}</th>)}
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
                            {headers.map(h => <td key={h} className="p-2 truncate" title={String(f.properties[h] ?? '')}>{String(f.properties[h] ?? '')}</td>)}
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
);

const FileUploader = ({ layer, title, name, onUpload, isProcessing }: { layer: 'boundary' | 'parcels' | 'homes', title: string, name: string, onUpload: (files: File[], layer: 'boundary' | 'parcels' | 'homes') => void, isProcessing: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
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
    
    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="mt-2 font-semibold">Processing {title}...</p>
            </div>
        );
    }

    if (name) {
        return (
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-green-50 border-green-200">
                <h4 className="font-semibold">{title}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <File className="h-4 w-4 text-green-700"/>
                  <span className="text-sm font-medium text-green-800">{name}</span>
                </div>
            </div>
        );
    }

    return (
        <div>
          <h4 className="font-semibold text-center mb-2">{title}</h4>
          <div
              onDragEnter={(e) => handleDrag(e, 'enter')}
              onDragLeave={(e) => handleDrag(e, 'leave')}
              onDragOver={(e) => handleDrag(e, 'over')}
              onDrop={handleDrop}
              className={cn(
              'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors duration-200',
              isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50'
              )}
          >
              <input
                  type="file"
                  id={`file-upload-${layer}`}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  multiple
                  accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.fbn,.fbx,.ain,.aih,.ixs,.mxs,.atx,.cpg,.xml"
                  onChange={(e) => onUpload(Array.from(e.target.files || []), layer)}
              />
              <UploadCloud className={cn("h-8 w-8", isDragging ? 'text-primary' : 'text-gray-400')} />
              <p className="mt-2 text-xs text-center text-muted-foreground">
                  {isDragging ? "Drop files here" : "Drag & drop shapefile components"}
              </p>
          </div>
        </div>
    );
};

const ImportPanel = ({ onUpload, isProcessing, boundaryName, parcelsName, homesName }: Omit<ParcelEditorDockerProps, 'selectedFeature' | 'allFeatures' | 'homesCount' | 'onDeleteSelected' | 'hasData' | 'onClearData' | 'onFeatureSelect' | 'onExportGeoJSON' | 'activeTool' | 'onToolSelect'| 'onUndo' | 'onRedo'| 'canUndo' | 'canRedo'>) => (
     <div className="p-4 space-y-6">
        <p className="text-xs text-muted-foreground">Upload shapefiles for each layer. The Boundary and Parcels layers are required for full functionality.</p>
        <FileUploader layer="boundary" title="Main Boundary" name={boundaryName} onUpload={onUpload} isProcessing={isProcessing['boundary']} />
        <FileUploader layer="parcels" title="Parcels Layer" name={parcelsName} onUpload={onUpload} isProcessing={isProcessing['parcels']} />
        <FileUploader layer="homes" title="Homes Layer" name={homesName} onUpload={onUpload} isProcessing={isProcessing['homes']} />
    </div>
);


const toolGroups: { name: string, tools: { id: EditorTool, name: string, icon: React.ElementType, implemented: boolean }[] }[] = [
    { name: 'Selection & Navigation', tools: [
        { id: 'select', name: 'Select', icon: MousePointer, implemented: true },
        { id: 'clear-selection', name: 'Clear Selection', icon: MinusSquare, implemented: true },
    ]},
    { name: 'Drawing', tools: [
        { id: 'draw-polygon', name: 'Draw Polygon', icon: PenSquare, implemented: true },
        { id: 'draw-rectangle', name: 'Draw Rectangle', icon: RectangleHorizontal, implemented: true },
    ]},
    { name: 'Editing', tools: [
        { id: 'edit-vertices', name: 'Edit Parcels', icon: Edit3, implemented: true },
        { id: 'delete', name: 'Delete Parcels', icon: Trash2, implemented: true },
    ]},
     { name: 'History', tools: [
        { id: 'undo', name: 'Undo', icon: Undo, implemented: true },
        { id: 'redo', name: 'Redo', icon: Redo, implemented: true },
    ]},
    { name: 'Geoprocessing', tools: [
        { id: 'split', name: 'Split Parcel', icon: Scissors, implemented: false },
        { id: 'merge', name: 'Merge Parcels', icon: Combine, implemented: false },
    ]},
    { name: 'Measurement & Snapping', tools: [
        { id: 'measure', name: 'Measure Distance', icon: Ruler, implemented: true },
        { id: 'snap-vertex', name: 'Snap to Vertex', icon: CircleDot, implemented: false },
        { id: 'snap-edge', name: 'Snap to Edge', icon: Magnet, implemented: false },
    ]},
];

interface ParcelEditorDockerProps {
    onUpload: (files: File[], layer: 'boundary' | 'parcels' | 'homes') => void;
    isProcessing: Record<string, boolean>;
    boundaryName: string;
    parcelsName: string;
    homesName: string;
    selectedFeature: any | null;
    allFeatures: any[];
    homesCount: number;
    onDeleteSelected: () => void;
    hasData: boolean;
    onClearData: () => void;
    onFeatureSelect: (feature: any) => void;
    onExportGeoJSON: () => void;
    activeTool: EditorTool;
    onToolSelect: (tool: EditorTool) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function ParcelEditorDocker({ 
    onUpload, isProcessing, boundaryName, parcelsName, homesName,
    selectedFeature, allFeatures, homesCount, onDeleteSelected, hasData, onClearData, 
    onFeatureSelect, onExportGeoJSON, activeTool, onToolSelect,
    onUndo, onRedo, canUndo, canRedo
}: ParcelEditorDockerProps) {

    const handleToolClick = (toolId: EditorTool) => {
        if (toolId === 'undo') onUndo();
        else if (toolId === 'redo') onRedo();
        else if (toolId === 'clear-selection') onFeatureSelect(null);
        else onToolSelect(toolId);
    };

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
                <div className="w-16 bg-muted/30 border-r p-2 flex flex-col items-center gap-2 overflow-y-auto">
                    <TooltipProvider delayDuration={0}>
                        {toolGroups.map((group, index) => (
                            <React.Fragment key={group.name}>
                                <div className="space-y-2">
                                    {group.tools.map(tool => {
                                        const isUndoRedo = tool.id === 'undo' || tool.id === 'redo';
                                        const isDisabled = 
                                            (!hasData && tool.id !== 'select') ||
                                            (tool.id === 'undo' && !canUndo) || 
                                            (tool.id === 'redo' && !canRedo);

                                        return (
                                            <Tooltip key={tool.id}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant={activeTool === tool.id ? 'default' : 'ghost'}
                                                        size="icon"
                                                        onClick={() => tool.implemented && handleToolClick(tool.id)}
                                                        className="h-10 w-10"
                                                        disabled={isDisabled}
                                                    >
                                                        <tool.icon className="h-5 w-5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    <p>{tool.name}</p>
                                                    {!tool.implemented && <p className="text-xs text-muted-foreground">(Future Enhancement)</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                                {index < toolGroups.length - 1 && <Separator className="my-2" />}
                            </React.Fragment>
                        ))}
                    </TooltipProvider>
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                     <Tabs defaultValue={hasData ? "properties" : "import"} value={hasData ? undefined : "import"} className="flex-1 flex flex-col min-h-0">
                        <div className="border-b p-2">
                            <TabsList className="grid w-full grid-cols-4 h-9">
                                <TabsTrigger value="import">Import</TabsTrigger>
                                <TabsTrigger value="properties" disabled={!hasData}>Properties</TabsTrigger>
                                <TabsTrigger value="table" disabled={!hasData}>Table</TabsTrigger>
                                <TabsTrigger value="export" disabled={!hasData}>Export</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="import" className="flex-1 min-h-0 -mt-0 data-[state=inactive]:hidden overflow-y-auto">
                            <ImportPanel onUpload={onUpload} isProcessing={isProcessing} boundaryName={boundaryName} parcelsName={parcelsName} homesName={homesName} />
                        </TabsContent>
                        <TabsContent value="properties" className="flex-1 min-h-0 -mt-0 data-[state=inactive]:hidden overflow-y-auto">
                             <PropertiesPanel feature={selectedFeature} parcelsCount={allFeatures.length} homesCount={homesCount} onDeleteClick={onDeleteSelected} />
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
