'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import L, { type LatLng } from 'leaflet';
import { MapContainer, TileLayer, FeatureGroup, useMap, Popup, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import * as XLSX from 'xlsx';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Layers, Map as MapIcon, Activity, Droplets, FlaskConical, Flame, Wheat, Snowflake, Waves, X, Calendar, Play, Pause, BarChart3, TrendingUp, AlertTriangle, ChevronsRight, FileDown, AreaChart, GitCommitHorizontal, FileText, FileJson, FileSpreadsheet } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { MapLegends } from './MapLegends';
import { LocationSearch } from './LocationSearch';
import { cn } from '@/lib/utils';
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const AVAILABLE_LAYERS = [
  { id: 'classification', name: 'AI Crop Classification', icon: Wheat },
  { id: 's2_true_color', name: 'Live Sentinel-2 Photo', icon: MapIcon },
  { id: 'ndvi', name: 'Greenness / Health (NDVI)', icon: Activity },
  { id: 'ndmi', name: 'Leaf Moisture (NDMI)', icon: Droplets },
  { id: 'ndre', name: 'Nitrogen Content (NDRE)', icon: FlaskConical },
  { id: 'bsi', name: 'Bare Soil / Ploughed (BSI)', icon: () => <div className="h-5 w-5 rounded-full bg-orange-900 border-2 border-orange-950/50" /> },
  { id: 'nbr', name: 'Stubble Burning (NBR)', icon: Flame },
];

const Scorecard = ({ data }: { data: any }) => (
    <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="p-0 mb-3">
            <CardTitle className="text-xl text-primary">{data.area_acres.toLocaleString()} Acres</CardTitle>
            <CardDescription className="text-sm font-semibold text-muted-foreground">{data.primary_crop}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-sm">
                <div className="bg-muted/50 p-2 rounded-lg">
                    <p className="text-muted-foreground text-[10px] font-semibold">Health (NDVI)</p>
                    <p className="font-semibold text-sm flex items-center gap-1"><Activity className="h-3 w-3 text-green-500"/> {data.avg_ndvi?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-2 rounded-lg">
                    <p className="text-muted-foreground text-[10px] font-semibold">Moisture (NDMI)</p>
                    <p className="font-semibold text-sm flex items-center gap-1"><Droplets className="h-3 w-3 text-blue-500"/> {data.avg_ndmi?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-2 rounded-lg">
                    <p className="text-muted-foreground text-[10px] font-semibold">Nitrogen (NDRE)</p>
                    <p className="font-semibold text-sm flex items-center gap-1"><FlaskConical className="h-3 w-3 text-amber-500"/> {data.avg_ndre?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-2 rounded-lg">
                    <p className="text-muted-foreground text-[10px] font-semibold">Burn Scar (NBR)</p>
                    <p className="font-semibold text-sm flex items-center gap-1"><Flame className="h-3 w-3 text-red-500"/> {data.burn_damage?.toFixed(2) ?? '...'}</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

const ChartTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/90 backdrop-blur-sm p-2 border border-border/50 rounded-lg shadow-lg">
                <p className="label font-semibold text-foreground mb-1">{`${label}`}</p>
                {payload.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                        <span style={{ color: p.stroke }} className="text-xs font-medium flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{backgroundColor: p.stroke}}></div>
                            {p.name}
                        </span>
                        <span style={{ color: p.stroke }} className="text-xs font-bold">
                            {p.value.toFixed(3)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CompactDynamicScorecard = ({ data, staticData }: { data: any, staticData: any }) => {
    if (!data || !staticData) return null;
    return (
        <div className="w-56">
            <div className="flex items-center justify-between mb-1.5">
                <div>
                    <p className="font-bold text-base text-primary">{staticData.area_acres?.toLocaleString() || ''} Acres</p>
                    <p className="text-xs font-semibold text-muted-foreground -mt-1">{data.date || staticData.primary_crop}</p>
                </div>
                <div className="p-2 rounded-full bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
                 <div className="bg-muted/50 p-1 rounded-md">
                    <p className="text-muted-foreground text-[9px]">Health (NDVI)</p>
                    <p className="font-semibold flex items-center gap-1"><Activity className="h-2.5 w-2.5 text-green-500"/> {data.ndvi?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-1 rounded-md">
                    <p className="text-muted-foreground text-[9px]">Moisture (NDMI)</p>
                    <p className="font-semibold flex items-center gap-1"><Droplets className="h-2.5 w-2.5 text-blue-500"/> {data.ndmi?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-1 rounded-md">
                    <p className="text-muted-foreground text-[9px]">Nitrogen (NDRE)</p>
                    <p className="font-semibold flex items-center gap-1"><FlaskConical className="h-2.5 w-2.5 text-amber-500"/> {data.ndre?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-1 rounded-md">
                    <p className="text-muted-foreground text-[9px]">Burn Scar (NBR)</p>
                    <p className="font-semibold flex items-center gap-1"><Flame className="h-2.5 w-2.5 text-red-500"/> {data.nbr?.toFixed(2) ?? '...'}</p>
                </div>
            </div>
        </div>
    );
};

const AnomalyDot = (props: any) => {
  const { cx, cy, payload, event } = props;
  if (!event) return null;

  const ICONS: Record<string, React.ReactNode> = {
    'peak': <TrendingUp className="h-3 w-3 text-white" />,
    'start': <ChevronsRight className="h-3 w-3 text-white" />,
    'stress': <AlertTriangle className="h-3 w-3 text-white" />,
    'burn': <Flame className="h-3 w-3 text-white" />,
  };
  const COLORS: Record<string, string> = {
    'peak': 'bg-green-500',
    'start': 'bg-blue-500',
    'stress': 'bg-yellow-500',
    'burn': 'bg-red-500',
  };

  return (
    <g transform={`translate(${cx},${cy})`}>
      <foreignObject x={-10} y={-10} width={20} height={20}>
        <TooltipProvider>
          <ShadTooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className={`flex items-center justify-center h-5 w-5 rounded-full ${COLORS[event.type]} ring-2 ring-background cursor-pointer`}>
                {ICONS[event.type]}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-semibold">
              <p>{event.description}</p>
            </TooltipContent>
          </ShadTooltip>
        </TooltipProvider>
      </foreignObject>
    </g>
  );
};

const MapContent = ({ onPolygonDrawn, onClear, drawnGeometry, isAnalyzing, analysisData, activeTimelinePoint, tileUrls, activeLayers, activeBand }: any) => {
    const featureGroupRef = useRef<L.FeatureGroup>(null);

    const onCreated = (e: any) => {
        onPolygonDrawn(e.layer.toGeoJSON().geometry);
        featureGroupRef.current?.clearLayers();
    }

    return (
        <>
            <TileLayer attribution='&copy; Google' url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" zIndex={1} />
            {Object.keys(tileUrls).map(layerId => (
                 activeLayers[layerId] && tileUrls[layerId] ? (
                    <TileLayer key={layerId} url={tileUrls[layerId]} opacity={0.8} zIndex={10} />
                ) : null
            ))}
            
            <div className="absolute top-4 left-4 z-[1000]"><LocationSearch /></div>
            <MapLegends currentBand={activeBand} />
            
            {drawnGeometry && <GeoJSON data={drawnGeometry} style={{ color: '#22c55e', weight: 3, fillOpacity: 0.2 }} />}

            <FeatureGroup ref={featureGroupRef}>
                <EditControl
                    position="topleft"
                    onCreated={onCreated}
                    onDeleted={onClear}
                    draw={{ polygon: { allowIntersection: false, shapeOptions: { color: '#22c55e', weight: 3, fillOpacity: 0.2 } }, rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false }}
                    edit={{ remove: true, edit: false }}
                />
            </FeatureGroup>
            
            {analysisData?.polygonCenter && !isAnalyzing && (
                 <Popup position={analysisData.polygonCenter} autoClose={false} closeOnClick={false} closeButton={false}>
                    <CompactDynamicScorecard data={activeTimelinePoint} staticData={analysisData.scorecard} />
                </Popup>
            )}
        </>
    );
};

export default function SentinelAnalysisClient() {
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [range, setRange] = useState(12);
    const [compare, setCompare] = useState(true);
    const [visibleLines, setVisibleLines] = useState({ ndvi: true, ndmi: true, ndre: true });
    const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
    const [tileUrls, setTileUrls] = useState<Record<string, string>>({});
    const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({ s2_true_color: true, ndvi: true });
    const [isFetchingTiles, setIsFetchingTiles] = useState(true);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [exportConfig, setExportConfig] = useState({ filename: `sentinel_analysis_${new Date().toISOString().split('T')[0]}`, format: 'csv' });

     useEffect(() => {
        const fetchTiles = async () => {
            setIsFetchingTiles(true);
            try {
                const res = await fetch(`/api/gee/tiles`);
                const data = await res.json();
                if (data.status === 'success') setTileUrls(data.tiles);
            } catch (error) {
                console.error("Failed to fetch GEE Tiles:", error);
            } finally {
                setIsFetchingTiles(false);
            }
        };
        fetchTiles();
    }, []);

    const toggleLayer = (layerId: string) => {
        setActiveLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    };

    const activeBand = useMemo(() => {
        const active = Object.keys(activeLayers).find(key => 
            key !== 's2_true_color' && key !== 'classification' && activeLayers[key]
        );
        return active;
    }, [activeLayers]);


    useEffect(() => {
        if (analysisData?.timeline) {
            setCurrentIndex(analysisData.timeline.length - 1);
        }
    }, [analysisData]);

    useEffect(() => {
        if (!isPlaying || !analysisData?.timeline?.length) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % analysisData.timeline.length);
        }, 800);
        return () => clearInterval(timer);
    }, [isPlaying, analysisData]);

    const runAnalysis = useCallback(async (geometry: any, currentRange: number, currentCompare: boolean) => {
        setIsAnalyzing(true);
        setAnalysisData(null);
        try {
            const res = await fetch(`/api/gee/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry, range: currentRange, compare: currentCompare })
            });
            if (!res.ok) throw new Error('Analysis request failed');
            const data = await res.json();
            if (data.status === 'success') {
                const center = L.geoJSON(geometry).getBounds().getCenter();
                setAnalysisData({ ...data, polygonCenter: center });
            } else {
                throw new Error(data.error || 'Analysis failed on server.');
            }
        } catch (error) {
            console.error("Analysis failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    }, []);
    
    const handlePolygonDrawn = useCallback((geometry: any) => {
        setDrawnGeometry(geometry);
        runAnalysis(geometry, range, compare);
    }, [range, compare, runAnalysis]);

    const handleClear = useCallback(() => {
        setDrawnGeometry(null);
        setAnalysisData(null);
    }, []);

    const handleRangeChange = useCallback((newRange: number) => {
        setRange(newRange);
        if (drawnGeometry) {
            runAnalysis(drawnGeometry, newRange, compare);
        }
    }, [drawnGeometry, compare, runAnalysis]);

    const handleCompareChange = useCallback((newCompare: boolean) => {
        setCompare(newCompare);
        if (drawnGeometry) {
            runAnalysis(drawnGeometry, range, newCompare);
        }
    }, [drawnGeometry, range, runAnalysis]);

    const toggleLineVisibility = (line: 'ndvi' | 'ndmi' | 'ndre') => {
        setVisibleLines(prev => ({...prev, [line]: !prev[line]}));
    };

    const activeTimelinePoint = useMemo(() => analysisData?.timeline?.[currentIndex] || {}, [analysisData, currentIndex]);
    
    const chartData = useMemo(() => {
        if (!analysisData?.timeline) return [];
        return analysisData.timeline.map((d: any, index: number) => {
            const ghostPoint = analysisData.ghostTimeline?.[index];
            return {
                ...d,
                ghost_ndvi: ghostPoint?.ndvi,
                ghost_ndmi: ghostPoint?.ndmi,
                ghost_ndre: ghostPoint?.ndre,
            }
        });
    }, [analysisData]);

     const combinedScorecardData = useMemo(() => {
        if (!analysisData?.scorecard) return null;
        return {
            ...analysisData.scorecard,
            avg_ndvi: activeTimelinePoint.ndvi,
            avg_ndmi: activeTimelinePoint.ndmi,
            avg_ndre: activeTimelinePoint.ndre,
            burn_damage: activeTimelinePoint.nbr,
        };
    }, [analysisData, activeTimelinePoint]);

    const chartConfig = [
        { key: 'ndvi', name: 'Health (NDVI)', color: '#22c55e', ghostKey: 'ghost_ndvi', ghostColor: '#166534'},
        { key: 'ndmi', name: 'Moisture (NDMI)', color: '#3b82f6', ghostKey: 'ghost_ndmi', ghostColor: '#1e40af'},
        { key: 'ndre', name: 'Nitrogen (NDRE)', color: '#f97316', ghostKey: 'ghost_ndre', ghostColor: '#9a3412'},
    ];

    const handleConfirmExport = () => {
        if (!analysisData?.timeline) return;
    
        const { timeline, ghostTimeline, events, scorecard } = analysisData;
    
        let dataToExport: Blob | string;
        let fileExtension: string;
        let mimeType: string | undefined;
        const fileName = exportConfig.filename || `sentinel_analysis_${new Date().toISOString().split('T')[0]}`;
    
        const headers = ['date', 'ndvi', 'ndmi', 'ndre', 'nbr'];
        if (compare && ghostTimeline) {
            headers.push('ndvi_yoy', 'ndmi_yoy', 'ndre_yoy');
        }
        const combinedData = timeline.map((point: any, index: number) => {
            const row: any = { ...point };
            if (compare && ghostTimeline && ghostTimeline[index]) {
                const ghostPoint = ghostTimeline[index];
                row.ndvi_yoy = ghostPoint.ndvi;
                row.ndmi_yoy = ghostPoint.ndmi;
                row.ndre_yoy = ghostPoint.ndre;
            }
            return row;
        });
    
        switch (exportConfig.format) {
            case 'json':
                dataToExport = JSON.stringify({ scorecard, timeline, ghostTimeline, events }, null, 2);
                fileExtension = 'json';
                mimeType = 'application/json';
                break;
            
            case 'xlsx':
                const timelineSheet = XLSX.utils.json_to_sheet(combinedData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Timeline');
                
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([scorecard]), 'Scorecard');
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(events), 'Key Events');
    
                const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                dataToExport = new Blob([xlsxData], { type: 'application/octet-stream' });
                fileExtension = 'xlsx';
                break;
    
            case 'csv':
            default:
                const csvContent = [
                    headers.join(','), 
                    ...combinedData.map((row: any) => headers.map(header => row[header] ?? '').join(','))
                ].join('\n');
                dataToExport = csvContent;
                fileExtension = 'csv';
                mimeType = 'text/csv;charset=utf-8;';
                break;
        }
    
        const blob = dataToExport instanceof Blob ? dataToExport : new Blob([dataToExport], { type: mimeType });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}.${fileExtension}`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    
        setIsExportDialogOpen(false);
    };

    return (
        <>
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle>Export Analysis Data</DialogTitle>
                    <DialogDescription>Customize your data export before downloading.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="filename">Filename</Label>
                            <Input
                                id="filename"
                                value={exportConfig.filename}
                                onChange={(e) => setExportConfig(prev => ({ ...prev, filename: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Format</Label>
                            <RadioGroup
                                value={exportConfig.format}
                                onValueChange={(value) => setExportConfig(prev => ({ ...prev, format: value }))}
                                className="grid grid-cols-3 gap-3"
                            >
                                <div>
                                    <RadioGroupItem value="csv" id="r-csv" className="peer sr-only" />
                                    <Label
                                        htmlFor="r-csv"
                                        className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                                    >
                                        <FileText className="mb-2 h-7 w-7" />
                                        <span className="font-semibold text-sm">CSV</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="json" id="r-json" className="peer sr-only" />
                                    <Label
                                        htmlFor="r-json"
                                        className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                                    >
                                        <FileJson className="mb-2 h-7 w-7" />
                                        <span className="font-semibold text-sm">JSON</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="xlsx" id="r-xlsx" className="peer sr-only" />
                                    <Label
                                        htmlFor="r-xlsx"
                                        className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                                    >
                                        <FileSpreadsheet className="mb-2 h-7 w-7" />
                                        <span className="font-semibold text-sm">Excel</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmExport}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex h-full w-full bg-background overflow-hidden">
                <div className="flex-1 relative">
                    <MapContainer center={[30.6682, 73.1114]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}>
                        <MapContent 
                            onPolygonDrawn={handlePolygonDrawn}
                            onClear={handleClear}
                            drawnGeometry={drawnGeometry}
                            isAnalyzing={isAnalyzing}
                            analysisData={analysisData} 
                            activeTimelinePoint={activeTimelinePoint}
                            tileUrls={tileUrls}
                            activeLayers={activeLayers}
                            activeBand={activeBand}
                        />
                    </MapContainer>
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-[1001]">
                            <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-2xl shadow-2xl">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="font-bold text-lg text-foreground">Running Temporal Analysis...</p>
                                <p className="text-sm text-muted-foreground -mt-2">This may take a few moments.</p>
                            </div>
                        </div>
                    )}
                </div>

                <aside className="w-[380px] border-l bg-background flex flex-col h-full">
                    <div className="p-2 border-b space-y-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-muted-foreground px-1">Analysis Controls</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 grid grid-cols-4 gap-1 bg-muted p-1 rounded-lg">
                                    {[3, 6, 12, 24].map(m => (
                                        <Button key={m} size="sm" variant={range === m ? 'default' : 'ghost'} className="flex-1 h-7 text-xs font-semibold" onClick={() => handleRangeChange(m)} disabled={isAnalyzing || !drawnGeometry}>{m}M</Button>
                                    ))}
                                </div>
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setIsExportDialogOpen(true)} disabled={!analysisData || isAnalyzing}>
                                    <FileDown className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <Label htmlFor="yoy-switch" className="flex flex-col gap-0">
                                <span className="font-semibold text-sm">Year-over-Year</span>
                                <span className="text-xs text-muted-foreground">Compare with last year's data.</span>
                            </Label>
                            <Switch id="yoy-switch" checked={compare} onCheckedChange={handleCompareChange} disabled={isAnalyzing || !drawnGeometry} />
                        </div>
                    </div>

                    <div className="p-2 border-b">
                        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block px-1">Data Layers</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                            {AVAILABLE_LAYERS.map(layer => (
                                <div key={layer.id} className="flex items-center justify-between p-1 rounded-md hover:bg-accent transition-colors border bg-accent/20">
                                    <Label htmlFor={layer.id} className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                                        <layer.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                        {layer.name}
                                    </Label>
                                    <Switch id={layer.id} checked={activeLayers[layer.id] || false} onCheckedChange={() => toggleLayer(layer.id)} disabled={isFetchingTiles} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-3">
                            {!drawnGeometry ? (
                                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-32">
                                    <AreaChart className="h-8 w-8 mb-2" />
                                    <h3 className="font-semibold text-foreground text-sm">Draw an Area to Begin</h3>
                                    <p className="text-xs mt-1">Use the polygon tool to select a field.</p>
                                </div>
                            ) : isAnalyzing ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-5 w-1/2" />
                                    <Skeleton className="h-3 w-1/3" />
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                    </div>
                                </div>
                            ) : analysisData && (
                                <div className="space-y-3">
                                    <Scorecard data={analysisData.scorecard} />
                                    {analysisData.events.length > 0 && (
                                        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                                        <AccordionItem value="item-1" className="border-b-0">
                                            <AccordionTrigger className="text-sm font-bold text-muted-foreground py-1 hover:no-underline rounded-md bg-muted/50 px-2 data-[state=open]:bg-accent">
                                            Key Anomaly Events ({analysisData.events.length})
                                            </AccordionTrigger>
                                            <AccordionContent>
                                            <div className="space-y-1.5 pt-2">
                                                {analysisData.events.map((event: any, i: number) => (
                                                    <div key={i} className="flex items-start gap-2 bg-muted/50 p-1.5 rounded-lg">
                                                        <GitCommitHorizontal className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0"/>
                                                        <div>
                                                            <p className="font-semibold text-xs">{event.description}</p>
                                                            <p className="text-xs text-muted-foreground">{event.date}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                        </Accordion>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-2 border-t space-y-1.5 bg-muted/30">
                        <div className="h-28">
                        {analysisData?.timeline ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 15, right: 5, left: -25, bottom: -5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                                    <XAxis dataKey="date" hide />
                                    <YAxis domain={[0, 1]} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 9}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                                    
                                    {chartConfig.map(line => visibleLines[line.key as keyof typeof visibleLines] && (
                                        <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2} dot={false} />
                                    ))}
                                    {compare && analysisData.ghostTimeline && chartConfig.map(line => visibleLines[line.key as keyof typeof visibleLines] && (
                                        <Line key={`ghost-${line.key}`} type="monotone" dataKey={line.ghostKey} name={`${line.name} (YoY)`} stroke={line.ghostColor} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                                    ))}

                                    {activeTimelinePoint.date && <ReferenceLine x={activeTimelinePoint.date} stroke="hsl(var(--destructive))" strokeWidth={1} />}

                                    {analysisData.events.map((event: any) => (
                                        <ReferenceDot 
                                        key={event.date + event.type} 
                                        x={event.date} 
                                        y={chartData.find((d: any) => d.date === event.date)?.ndvi ?? 0}
                                        ifOverflow="extendDomain" 
                                        r={0}
                                        shape={<AnomalyDot event={event} />}
                                        />
                                    ))}

                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground bg-background rounded-md">
                                <p>{drawnGeometry ? (isAnalyzing ? 'Loading chart data...' : 'Analysis complete.') : 'Draw a polygon to view timeline'}</p>
                            </div>
                        )}
                        </div>
                        <div className="flex justify-center gap-1.5">
                            {chartConfig.map(line => (
                                <button key={line.key} onClick={() => toggleLineVisibility(line.key as keyof typeof visibleLines)}
                                    className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all border", visibleLines[line.key as keyof typeof visibleLines] ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-transparent hover:border-border')}>
                                    <div className="h-1.5 w-1.5 rounded-full" style={{backgroundColor: line.color}}></div>
                                    {line.name.split('(')[0].trim()}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsPlaying(!isPlaying)} disabled={!analysisData}>
                                {isPlaying ? <Pause className="h-3.5 w-3.5"/> : <Play className="h-3.5 w-3.5"/>}
                            </Button>
                            <div className="flex-1 space-y-0.5">
                                <p className="text-center text-xs font-mono text-primary font-semibold">{activeTimelinePoint.date || '---'}</p>
                                <Slider value={[currentIndex]} max={analysisData?.timeline?.length -1 || 0} onValueChange={([val]) => setCurrentIndex(val)} disabled={!analysisData} />
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
}
