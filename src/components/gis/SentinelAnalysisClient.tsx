'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import L, { type LatLng } from 'leaflet';
import { MapContainer, TileLayer, FeatureGroup, useMap, Popup, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Layers, Map as MapIcon, Activity, Droplets, FlaskConical, Flame, Wheat, Calendar, Play, Pause, BarChart3, TrendingUp, AlertTriangle, ChevronsRight, FileDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { MapLegends } from './MapLegends';
import { LocationSearch } from './LocationSearch';
import { cn } from '@/lib/utils';
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const AVAILABLE_LAYERS = [
  { id: 'classification', name: 'AI Crop Classification', icon: Wheat },
  { id: 's2_true_color', name: 'Live Sentinel-2 Photo', icon: MapIcon },
  { id: 'ndvi', name: 'Greenness / Health (NDVI)', icon: Activity },
  { id: 'ndmi', name: 'Leaf Moisture (NDMI)', icon: Droplets },
  { id: 'ndre', name: 'Nitrogen Content (NDRE)', icon: FlaskConical },
  { id: 'bsi', name: 'Bare Soil / Ploughed (BSI)', icon: () => <span className="text-lg">🟫</span> },
  { id: 'nbr', name: 'Stubble Burning (NBR)', icon: Flame },
];

const Scorecard = ({ data }: { data: any }) => (
    <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="p-0 mb-2">
            <CardTitle className="text-xl text-primary">{data.area_acres.toLocaleString()} Acres</CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-semibold">{data.primary_crop}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="bg-muted/50 p-1.5 rounded">
                    <p className="text-muted-foreground text-[10px]">Health (NDVI)</p>
                    <p className="font-semibold flex items-center gap-1"><Activity className="h-3 w-3 text-green-500"/> {data.avg_ndvi?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-1.5 rounded">
                    <p className="text-muted-foreground text-[10px]">Moisture (NDMI)</p>
                    <p className="font-semibold flex items-center gap-1"><Droplets className="h-3 w-3 text-blue-500"/> {data.avg_ndmi?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-1.5 rounded">
                    <p className="text-muted-foreground text-[10px]">Nitrogen (NDRE)</p>
                    <p className="font-semibold flex items-center gap-1"><FlaskConical className="h-3 w-3 text-amber-500"/> {data.avg_ndre?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-1.5 rounded">
                    <p className="text-muted-foreground text-[10px]">Burn Scar (NBR)</p>
                    <p className="font-semibold flex items-center gap-1"><Flame className="h-3 w-3 text-red-500"/> {data.burn_damage?.toFixed(2) ?? '...'}</p>
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
                        <span style={{ color: p.stroke }} className="text-sm font-medium flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{backgroundColor: p.stroke}}></div>
                            {p.name}
                        </span>
                        <span style={{ color: p.stroke }} className="text-sm font-bold">
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
        <div className="w-60">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="font-bold text-lg text-primary">{staticData.area_acres?.toLocaleString() || ''} Acres</p>
                    <p className="text-xs font-semibold text-muted-foreground -mt-1">{data.date || staticData.primary_crop}</p>
                </div>
                <div className="p-2 rounded-full bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
                 <div className="bg-muted/50 p-1.5 rounded-md">
                    <p className="text-muted-foreground text-[10px]">Health (NDVI)</p>
                    <p className="font-semibold flex items-center gap-1"><Activity className="h-3 w-3 text-green-500"/> {data.ndvi?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-1.5 rounded-md">
                    <p className="text-muted-foreground text-[10px]">Moisture (NDMI)</p>
                    <p className="font-semibold flex items-center gap-1"><Droplets className="h-3 w-3 text-blue-500"/> {data.ndmi?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-1.5 rounded-md">
                    <p className="text-muted-foreground text-[10px]">Nitrogen (NDRE)</p>
                    <p className="font-semibold flex items-center gap-1"><FlaskConical className="h-3 w-3 text-amber-500"/> {data.ndre?.toFixed(2) ?? '...'}</p>
                </div>
                <div className="bg-muted/50 p-1.5 rounded-md">
                    <p className="text-muted-foreground text-[10px]">Burn Scar (NBR)</p>
                    <p className="font-semibold flex items-center gap-1"><Flame className="h-3 w-3 text-red-500"/> {data.nbr?.toFixed(2) ?? '...'}</p>
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
      <foreignObject x={-12} y={-12} width={24} height={24}>
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


const MapContent = ({ onPolygonDrawn, onClear, drawnGeometry, isAnalyzing, analysisData, activeTimelinePoint }: any) => {
    const [tileUrls, setTileUrls] = useState<Record<string, string>>({});
    const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({ s2_true_color: true });
    const featureGroupRef = useRef<L.FeatureGroup>(null);
    const [isFetchingTiles, setIsFetchingTiles] = useState(true);

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

    const activeBand = Object.keys(activeLayers).find(key => key !== 's2_true_color' && activeLayers[key]);

    const onCreated = (e: any) => {
        onPolygonDrawn(e.layer.toGeoJSON().geometry);
        // Immediately clear the temporary layer drawn by the library
        // because we will render it declaratively from our state.
        featureGroupRef.current?.clearLayers();
    }

    return (
        <>
            <TileLayer attribution='&copy; Google' url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" zIndex={1} />
            {AVAILABLE_LAYERS.map((layer) => (
                activeLayers[layer.id] && tileUrls[layer.id] ? (
                    <TileLayer key={layer.id} url={tileUrls[layer.id]} opacity={0.8} zIndex={10} />
                ) : null
            ))}
            <div className="absolute top-4 right-4 z-[1000] w-72">
                <Card className="bg-card/80 backdrop-blur-md shadow-2xl border-border/50">
                    <CardHeader className="p-3 border-b border-border/50">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Layers className="h-5 w-5 text-primary" />
                            Data Layers
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-1">
                    <ScrollArea className="h-64">
                        <div className="space-y-1 p-1">
                        {isFetchingTiles ? (
                            Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5">
                                <div className="flex items-center gap-3">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="h-6 w-11 rounded-full" />
                            </div>
                            ))
                        ) : (
                            AVAILABLE_LAYERS.map(layer => (
                                <div key={layer.id} className="flex items-center justify-between p-1.5 rounded-md hover:bg-accent/50 transition-colors">
                                    <Label htmlFor={layer.id} className="flex items-center gap-3 cursor-pointer text-sm font-medium">
                                        <layer.icon className="h-5 w-5 text-muted-foreground" />
                                        {layer.name}
                                    </Label>
                                    <Switch id={layer.id} checked={activeLayers[layer.id] || false} onCheckedChange={() => toggleLayer(layer.id)} />
                                </div>
                            ))
                        )}
                        </div>
                    </ScrollArea>
                    </CardContent>
                </Card>
            </div>
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
    const [compare, setCompare] = useState(false);
    const [visibleLines, setVisibleLines] = useState({ ndvi: true, ndmi: false, ndre: false });
    const [drawnGeometry, setDrawnGeometry] = useState<any>(null);

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

    const handleExport = () => {
        if (!analysisData?.timeline) {
            return;
        }

        const { timeline, ghostTimeline } = analysisData;
        
        const headers = ['date', 'ndvi', 'ndmi', 'ndre', 'nbr'];
        if (compare && ghostTimeline) {
            headers.push('ndvi_yoy', 'ndmi_yoy', 'ndre_yoy', 'nbr_yoy');
        }

        const combinedData = timeline.map((point: any, index: number) => {
            const row: any = { ...point };
            if (compare && ghostTimeline && ghostTimeline[index]) {
                const ghostPoint = ghostTimeline[index];
                row.ndvi_yoy = ghostPoint.ndvi;
                row.ndmi_yoy = ghostPoint.ndmi;
                row.ndre_yoy = ghostPoint.ndre;
                row.nbr_yoy = ghostPoint.nbr;
            }
            return row;
        });

        const csvContent = [
            headers.join(','), 
            ...combinedData.map((row: any) => headers.map(header => row[header] ?? '').join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `sentinel_analysis_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
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
                    />
                </MapContainer>
                {isAnalyzing && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-[1001]">
                        <div className="flex flex-col items-center gap-2 p-4 bg-card/90 backdrop-blur-md rounded-lg shadow-2xl">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="font-semibold text-foreground">Running Temporal Analysis...</p>
                        </div>
                    </div>
                )}
            </div>

            <aside className="w-[380px] border-l bg-background flex flex-col h-full">
                <div className="p-3 border-b">
                    <h2 className="font-semibold text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Sentinel Analysis</h2>
                    <p className="text-xs text-muted-foreground">Time-series and YoY performance analysis.</p>
                </div>
                
                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-4">
                        <Card>
                            <CardHeader className="p-3">
                                <CardTitle className="text-sm">Analysis Controls</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Time Range</Label>
                                    <div className="flex gap-1 bg-muted p-1 rounded-md">
                                        {[3, 6, 12, 24].map(m => (
                                            <Button key={m} size="sm" variant={range === m ? 'default' : 'ghost'} className="flex-1 h-8 text-xs" onClick={() => handleRangeChange(m)} disabled={isAnalyzing || !drawnGeometry}>{m}M</Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-xs">
                                        <Calendar className="h-4 w-4" />
                                        Year-over-Year (YoY)
                                    </Label>
                                    <Switch checked={compare} onCheckedChange={handleCompareChange} disabled={isAnalyzing || !drawnGeometry} />
                                </div>
                                 <Button 
                                    variant="outline" 
                                    className="w-full mt-2" 
                                    onClick={handleExport} 
                                    disabled={!analysisData || isAnalyzing}
                                >
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export as CSV
                                </Button>
                            </CardContent>
                        </Card>

                        {combinedScorecardData ? (
                             <Card>
                                <CardHeader className="p-3">
                                    <CardTitle className="text-sm">Scorecard</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3">
                                    <Scorecard data={combinedScorecardData} />
                                </CardContent>
                            </Card>
                        ) : (drawnGeometry && isAnalyzing) ? (
                            <Card>
                                <CardHeader className="p-3"><CardTitle className="text-sm">Scorecard</CardTitle></CardHeader>
                                <CardContent className="p-3 space-y-2">
                                    <Skeleton className="h-6 w-1/2" />
                                    <Skeleton className="h-4 w-1/3" />
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}
                    </div>
                </ScrollArea>

                <div className="p-3 border-t space-y-2 bg-muted/50">
                    <div className="h-40">
                    {analysisData?.timeline ? (
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                                <XAxis dataKey="date" hide />
                                <YAxis domain={[0, 1]} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                                
                                {chartConfig.map(line => visibleLines[line.key as keyof typeof visibleLines] && (
                                    <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2.5} dot={false} />
                                ))}
                                {compare && analysisData.ghostTimeline && chartConfig.map(line => visibleLines[line.key as keyof typeof visibleLines] && (
                                    <Line key={`ghost-${line.key}`} type="monotone" dataKey={line.ghostKey} name={`${line.name} (YoY)`} stroke={line.ghostColor} strokeWidth={2} strokeDasharray="4 4" dot={false} />
                                ))}

                                {activeTimelinePoint.date && <ReferenceLine x={activeTimelinePoint.date} stroke="hsl(var(--destructive))" strokeWidth={1.5} />}

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
                    <div className="flex justify-center gap-2">
                        {chartConfig.map(line => (
                            <button key={line.key} onClick={() => toggleLineVisibility(line.key as keyof typeof visibleLines)}
                                className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold transition-all", visibleLines[line.key as keyof typeof visibleLines] ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground opacity-70 hover:opacity-100')}>
                                <div className="h-2 w-2 rounded-full" style={{backgroundColor: line.color}}></div>
                                {line.name.split('(')[0].trim()}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                        <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} disabled={!analysisData}>
                            {isPlaying ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
                        </Button>
                        <div className="flex-1 space-y-1">
                            <Slider value={[currentIndex]} max={analysisData?.timeline?.length -1 || 0} onValueChange={([val]) => setCurrentIndex(val)} disabled={!analysisData} />
                            <p className="text-center text-xs font-mono text-primary">{activeTimelinePoint.date || '---'}</p>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}
