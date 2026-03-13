'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import L, { type LatLng } from 'leaflet';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Layers, Map as MapIcon, Activity, Droplets, FlaskConical, Flame, Wheat, Snowflake, Waves, Play, Pause, BarChart3, CalendarDays } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { MapLegends } from './MapLegends';
import { LocationSearch } from './LocationSearch';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const AVAILABLE_LAYERS = [
  { id: 'classification', name: 'AI Crop Classification', icon: Wheat },
  { id: 's2_true_color', name: 'Live Sentinel-2 Photo', icon: MapIcon },
  { id: 'ndvi', name: 'Greenness / Health (NDVI)', icon: Activity },
  { id: 'ndmi', name: 'Leaf Moisture (NDMI)', icon: Droplets },
  { id: 'ndre', name: 'Nitrogen Content (NDRE)', icon: FlaskConical },
  { id: 'ndwi', name: 'Flood / Water Risk (NDWI)', icon: Waves },
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
                    <p className="font-semibold flex items-center gap-1"><Activity className="h-3 w-3 text-green-500"/> {data.avg_ndvi}</p>
                </div>
                <div className="bg-muted/50 p-1.5 rounded">
                    <p className="text-muted-foreground text-[10px]">Moisture (NDMI)</p>
                    <p className="font-semibold flex items-center gap-1"><Droplets className="h-3 w-3 text-blue-500"/> {data.avg_ndmi}</p>
                </div>
                <div className="bg-muted/50 p-1.5 rounded">
                    <p className="text-muted-foreground text-[10px]">Nitrogen (NDRE)</p>
                    <p className="font-semibold flex items-center gap-1"><FlaskConical className="h-3 w-3 text-amber-500"/> {data.avg_ndre}</p>
                </div>
                <div className="bg-muted/50 p-1.5 rounded">
                    <p className="text-muted-foreground text-[10px]">Burn Scar (NBR)</p>
                    <p className="font-semibold flex items-center gap-1"><Flame className="h-3 w-3 text-red-500"/> {data.burn_damage}</p>
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
                    <p key={i} style={{ color: p.stroke }} className="text-sm font-medium">
                        {`${p.name}: ${p.value.toFixed(3)}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


const MapContent = ({ onPolygonDrawn, setAnalysisData }: any) => {
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

    const handleClear = useCallback(() => {
        featureGroupRef.current?.clearLayers();
        setAnalysisData(null);
    }, [setAnalysisData]);

    const toggleLayer = (layerId: string) => {
        setActiveLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    };

    const activeBand = Object.keys(activeLayers).find(key => key !== 's2_true_color' && activeLayers[key]);

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
            <FeatureGroup ref={featureGroupRef}>
                <EditControl
                    position="topleft"
                    onCreated={onPolygonDrawn}
                    onDeleted={handleClear}
                    draw={{ polygon: { allowIntersection: false, shapeOptions: { color: '#22c55e', weight: 3, fillOpacity: 0.2 } }, rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false }}
                    edit={{ remove: true, edit: false }}
                />
            </FeatureGroup>
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

    const runAnalysis = async (geometry: any, currentRange: number, currentCompare: boolean) => {
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
                setAnalysisData({ ...data, drawnGeometry: geometry });
            } else {
                throw new Error(data.error || 'Analysis failed on server.');
            }
        } catch (error) {
            console.error("Analysis failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const onPolygonDrawn = (e: any) => {
        const layer = e.layer;
        const geoJson = layer.toGeoJSON();
        runAnalysis(geoJson.geometry, range, compare);
    };

    const handleRangeChange = (newRange: number) => {
        setRange(newRange);
        if (analysisData?.drawnGeometry) {
            runAnalysis(analysisData.drawnGeometry, newRange, compare);
        }
    };

    const handleCompareChange = (newCompare: boolean) => {
        setCompare(newCompare);
        if (analysisData?.drawnGeometry) {
            runAnalysis(analysisData.drawnGeometry, range, newCompare);
        }
    };

    const activeTimelinePoint = useMemo(() => analysisData?.timeline?.[currentIndex] || {}, [analysisData, currentIndex]);
    const chartData = useMemo(() => {
        if (!analysisData?.timeline) return [];
        return analysisData.timeline.map((d: any, index: number) => ({
            ...d,
            ghost_ndvi: analysisData.ghostTimeline?.[index]?.ndvi
        }));
    }, [analysisData]);

    return (
        <div className="flex h-full w-full bg-background overflow-hidden">
            <div className="flex-1 relative">
                <MapContainer center={[30.6682, 73.1114]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}>
                    <MapContent onPolygonDrawn={onPolygonDrawn} setAnalysisData={setAnalysisData} />
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
                                            <Button key={m} size="sm" variant={range === m ? 'default' : 'ghost'} className="flex-1 h-8 text-xs" onClick={() => handleRangeChange(m)} disabled={isAnalyzing}>{m}M</Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-xs">
                                        <CalendarDays className="h-4 w-4" /> Year-over-Year (YoY)
                                    </Label>
                                    <Switch checked={compare} onCheckedChange={handleCompareChange} disabled={isAnalyzing} />
                                </div>
                            </CardContent>
                        </Card>

                        {analysisData && analysisData.scorecard ? (
                             <Card>
                                <CardHeader className="p-3">
                                    <CardTitle className="text-sm">Scorecard</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3">
                                    <Scorecard data={analysisData.scorecard} />
                                </CardContent>
                            </Card>
                        ) : isAnalyzing ? (
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

                <div className="p-3 border-t space-y-3 bg-muted/50">
                    <div className="h-40">
                    {analysisData?.timeline ? (
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
                                <XAxis dataKey="date" hide />
                                <YAxis domain={[0, 1]} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                                <Line type="monotone" dataKey="ndvi" name="Health (NDVI)" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                                {compare && analysisData.ghostTimeline && <Line type="monotone" dataKey="ghost_ndvi" name="Health (YoY)" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" dot={false} />}
                                {activeTimelinePoint.date && <ReferenceLine x={activeTimelinePoint.date} stroke="red" strokeWidth={1.5} />}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground bg-background rounded-md">
                            <p>{isAnalyzing ? 'Loading chart data...' : 'Draw a polygon to view timeline'}</p>
                        </div>
                    )}
                    </div>

                    <div className="flex items-center gap-4">
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
