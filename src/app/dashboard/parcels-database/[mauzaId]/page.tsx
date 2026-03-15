
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { MauzaMetadata } from '@/types/gis-schema';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L, { LatLngBoundsExpression } from 'leaflet';
import { Loader2, ArrowLeft, Download, MapPin, Layers, Square, Search, X, Table } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import * as turf from '@turf/turf';
import { cn } from '@/lib/utils';

// --- TYPE DEFINITIONS ---
type GeoJsonFeature = { type: 'Feature'; properties: any; geometry: any, id: string };

// --- MAP COMPONENTS ---
const MapEffect = ({ bounds }: { bounds: LatLngBoundsExpression | null }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && map) {
            map.flyToBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
};

// --- SIDE PANEL COMPONENTS ---
const SidePanelHeader = ({ mauza, isLoading }: { mauza: MauzaMetadata | null, isLoading: boolean }) => (
    <div className="p-4 border-b">
        <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
                <Link href="/dashboard/parcels-database">
                    <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="space-y-1">
                    {isLoading ? (
                        <>
                            <Skeleton className="h-6 w-48 mb-1" />
                            <Skeleton className="h-4 w-32" />
                        </>
                    ) : mauza ? (
                        <>
                            <h1 className="text-lg font-bold text-foreground">{mauza.name}</h1>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="h-3 w-3"/> {mauza.district}, {mauza.tehsil}
                            </p>
                        </>
                    ) : (
                        <h1 className="text-lg font-bold text-destructive">Mauza Not Found</h1>
                    )}
                </div>
            </div>
            {mauza && (
                <Button size="sm" variant="outline" onClick={() => {
                    const blob = new Blob([JSON.stringify({ ...mauza, parcelsData: '...' })], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `${mauza.id}.json`; a.click(); URL.revokeObjectURL(url);
                }} className="h-10">
                    <Download className="mr-2 h-4 w-4" /> Export
                </Button>
            )}
        </div>
        {mauza && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                    <p className="font-bold text-primary">{mauza.totalParcels.toLocaleString()}</p>
                    <p className="text-xs font-medium text-muted-foreground">Parcels</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                    <p className="font-bold text-primary">{(mauza.totalAreaAcres || 0).toLocaleString()}</p>
                    <p className="text-xs font-medium text-muted-foreground">Acres</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                    <p className="font-bold text-primary truncate">{mauza.hudbust_no}</p>
                    <p className="text-xs font-medium text-muted-foreground">Hudbust</p>
                </div>
            </div>
        )}
    </div>
);

const ParcelDetails = ({ parcel }: { parcel: GeoJsonFeature | null }) => {
    if (!parcel) {
        return (
            <div className="p-4 text-center text-sm text-muted-foreground">
                <Table className="mx-auto h-8 w-8 mb-2"/>
                Select a parcel on the map or from the list to see its details.
            </div>
        )
    }

    const areaSqm = turf.area(parcel);
    const areaAcres = areaSqm * 0.000247105;

    return (
        <div className="p-3">
             <h3 className="font-semibold text-sm mb-2 text-primary">Parcel Details</h3>
             <div className="space-y-1 text-xs">
                {Object.entries(parcel.properties).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start">
                        <span className="font-medium text-muted-foreground capitalize w-2/5">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-right w-3/5 break-words">{String(value)}</span>
                    </div>
                ))}
                <Separator className="my-2"/>
                 <div className="flex justify-between items-center">
                    <span className="font-medium text-muted-foreground">Area (Sqm)</span>
                    <span className="font-semibold">{areaSqm.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-medium text-muted-foreground">Area (Acres)</span>
                    <span className="font-semibold">{areaAcres.toFixed(4)}</span>
                </div>
             </div>
        </div>
    )
};

// --- MAIN PAGE COMPONENT ---
export default function MauzaDetailPage() {
    const params = useParams();
    const mauzaId = params.mauzaId as string;
    const firestore = useFirestore();
    const mapRef = useRef<L.Map>(null);

    const [boundaryGeoJson, setBoundaryGeoJson] = useState<any>(null);
    const [parcelsGeoJson, setParcelsGeoJson] = useState<any>(null);
    const [isLoadingGeometries, setIsLoadingGeometries] = useState(true);
    
    const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
    const [parcelSearchTerm, setParcelSearchTerm] = useState('');

    const mauzaDocRef = useMemoFirebase(() => {
        if (!firestore || !mauzaId) return null;
        return doc(firestore, 'Mauzas', mauzaId);
    }, [firestore, mauzaId]);

    const { data: mauza, isLoading: isMauzaLoading } = useDoc<MauzaMetadata>(mauzaDocRef);

    useEffect(() => {
        const fetchGeometries = async () => {
            if (!mauza) return;

            setIsLoadingGeometries(true);
            try {
                const fetches = [];
                if (mauza.geometryUrl) {
                    fetches.push(fetch(mauza.geometryUrl).then(res => res.json()).then(data => {
                        data.features.forEach((f:any, i:number) => f.id = f.id || `boundary-${i}`);
                        setBoundaryGeoJson(data);
                    }));
                }
                if (mauza.parcelsGeometryUrl) {
                    fetches.push(fetch(mauza.parcelsGeometryUrl).then(res => res.json()).then(data => {
                         data.features.forEach((f:any, i:number) => f.id = f.id || `parcel-${i}`);
                        setParcelsGeoJson(data);
                    }));
                }
                await Promise.all(fetches);
            } catch (e) {
                console.error("Failed to fetch geometries", e);
            } finally {
                setIsLoadingGeometries(false);
            }
        };
        fetchGeometries();
    }, [mauza]);

    const parcels = useMemo(() => parcelsGeoJson?.features || [], [parcelsGeoJson]);
    
    const filteredParcels = useMemo(() => {
        if (!parcelSearchTerm) return parcels;
        const term = parcelSearchTerm.toLowerCase();
        return parcels.filter((p: GeoJsonFeature) => 
            Object.values(p.properties).some(val => 
                String(val).toLowerCase().includes(term)
            )
        );
    }, [parcels, parcelSearchTerm]);

    const selectedParcel = useMemo(() => {
        if (!selectedParcelId) return null;
        return parcels.find((p: GeoJsonFeature) => p.id === selectedParcelId) || null;
    }, [parcels, selectedParcelId]);

    const handleParcelClick = useCallback((feature: GeoJsonFeature) => {
        setSelectedParcelId(feature.id);
        if (mapRef.current && feature.geometry) {
            try {
                const boundingBox = turf.bbox(feature);
                mapRef.current.flyToBounds([[boundingBox[1], boundingBox[0]], [boundingBox[3], boundingBox[2]]], { padding: [50, 50], maxZoom: 18 });
            } catch(e) { console.error("Could not fly to feature:", e); }
        }
    }, []);

    const getParcelStyle = useCallback((feature: GeoJsonFeature) => ({
        color: feature.id === selectedParcelId ? '#f59e0b' : '#2563eb',
        weight: feature.id === selectedParcelId ? 3 : 1.5,
        fillOpacity: feature.id === selectedParcelId ? 0.6 : 0.1,
        fillColor: feature.id === selectedParcelId ? '#f59e0b' : '#2563eb',
    }), [selectedParcelId]);
    
    const overallBounds = useMemo(() => {
        if (!boundaryGeoJson && !parcelsGeoJson) return null;
        const bounds = new L.LatLngBounds([]);
        if (boundaryGeoJson) bounds.extend(L.geoJSON(boundaryGeoJson).getBounds());
        if (parcelsGeoJson) bounds.extend(L.geoJSON(parcelsGeoJson).getBounds());
        return bounds.isValid() ? bounds : null;
    }, [boundaryGeoJson, parcelsGeoJson]);

    if (isMauzaLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex h-full w-full bg-muted/30 overflow-hidden">
            <div className="flex-1 relative">
                <MapContainer ref={mapRef} center={[31.5, 74.3]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution="&copy; Google" />
                    
                    {isLoadingGeometries && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-[1001]">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    
                    {boundaryGeoJson && <GeoJSON data={boundaryGeoJson} style={{ color: "#dc2626", weight: 3, fill: false }} />}
                    
                    {parcelsGeoJson && <GeoJSON 
                        key={selectedParcelId} // Force re-render on selection change
                        data={parcelsGeoJson} 
                        style={getParcelStyle}
                        onEachFeature={(feature, layer) => {
                            layer.on({ click: () => handleParcelClick(feature as GeoJsonFeature) });
                        }}
                    />}

                    <MapEffect bounds={overallBounds} />
                </MapContainer>
            </div>

            <aside className="w-[400px] border-l bg-background flex flex-col h-full">
                <SidePanelHeader mauza={mauza} isLoading={isMauzaLoading} />
                
                <div className="p-2 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder={`Search ${parcels.length} parcels...`}
                            className="pl-10 h-10"
                            value={parcelSearchTerm}
                            onChange={e => setParcelSearchTerm(e.target.value)}
                        />
                        {parcelSearchTerm && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setParcelSearchTerm('')}><X className="h-4 w-4"/></Button>}
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {filteredParcels.length === 0 && !isLoadingGeometries && (
                        <div className="text-center p-8 text-sm text-muted-foreground">
                            <p>No parcels found matching your search.</p>
                        </div>
                    )}
                    <div className="divide-y divide-border">
                        {filteredParcels.map((p: GeoJsonFeature) => (
                             <div 
                                key={p.id} 
                                onClick={() => handleParcelClick(p)}
                                className={cn(
                                    "p-3 cursor-pointer hover:bg-accent",
                                    selectedParcelId === p.id && "bg-primary/10"
                                )}
                             >
                                <p className="font-semibold text-sm truncate">{p.properties.khasra || p.properties.Plot_No || `ID: ${p.id}`}</p>
                                <p className="text-xs text-muted-foreground">{p.properties.land_use || 'N/A'}</p>
                             </div>
                        ))}
                    </div>
                </ScrollArea>
                
                <div className="border-t">
                    <ParcelDetails parcel={selectedParcel} />
                </div>
            </aside>
        </div>
    );
}
