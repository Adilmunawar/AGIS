'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { MauzaMetadata } from '@/types/gis-schema';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, ArrowLeft, Download, MapPin, Layers, Square } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const MapEffect = ({ geoJsonData }: { geoJsonData: any }) => {
    const map = useMap();
    useEffect(() => {
        if (geoJsonData && map) {
            const layer = L.geoJSON(geoJsonData);
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
                map.flyToBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [geoJsonData, map]);
    return null;
};

const PageHeader = ({ mauza, isLoading }: { mauza: MauzaMetadata | null, isLoading: boolean }) => (
    <div className="absolute top-0 left-0 z-[1000] w-full p-4 pointer-events-none">
        <div className="flex justify-between items-start">
            <Card className="pointer-events-auto shadow-xl">
                <CardHeader className="flex flex-row items-center gap-4 p-3">
                    <Link href="/dashboard/parcels-database">
                        <Button variant="outline" size="icon" className="h-10 w-10">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        {isLoading ? (
                            <>
                                <Skeleton className="h-6 w-48 mb-1" />
                                <Skeleton className="h-4 w-32" />
                            </>
                        ) : mauza ? (
                            <>
                                <CardTitle className="text-lg">{mauza.name}</CardTitle>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3"/> {mauza.district}, {mauza.tehsil}
                                </p>
                            </>
                        ) : (
                             <CardTitle className="text-lg text-destructive">Mauza Not Found</CardTitle>
                        )}
                    </div>
                </CardHeader>
            </Card>
        </div>
    </div>
);

export default function MauzaDetailPage() {
    const params = useParams();
    const mauzaId = params.mauzaId as string;
    const firestore = useFirestore();

    const mauzaDocRef = useMemoFirebase(() => {
        if (!firestore || !mauzaId) return null;
        return doc(firestore, 'Mauzas', mauzaId);
    }, [firestore, mauzaId]);

    const { data: mauza, isLoading: isMauzaLoading } = useDoc<MauzaMetadata>(mauzaDocRef);

    const [boundaryGeoJson, setBoundaryGeoJson] = useState(null);
    const [parcelsGeoJson, setParcelsGeoJson] = useState(null);
    const [isLoadingGeometries, setIsLoadingGeometries] = useState(false);

    useEffect(() => {
        const fetchGeometries = async () => {
            if (!mauza) return;

            setIsLoadingGeometries(true);
            try {
                const fetches = [];
                if (mauza.geometryUrl) {
                    fetches.push(fetch(mauza.geometryUrl).then(res => res.json()).then(setBoundaryGeoJson));
                }
                if ((mauza as any).parcelsGeometryUrl) {
                    fetches.push(fetch((mauza as any).parcelsGeometryUrl).then(res => res.json()).then(setParcelsGeoJson));
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

    const allGeoJson = useMemo(() => {
        if (!boundaryGeoJson && !parcelsGeoJson) return null;
        const features = [
            ...(boundaryGeoJson ? (boundaryGeoJson as any).features : []),
            ...(parcelsGeoJson ? (parcelsGeoJson as any).features : [])
        ];
        return { type: 'FeatureCollection', features };
    }, [boundaryGeoJson, parcelsGeoJson]);

    if (isMauzaLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="h-full w-full relative">
            <MapContainer center={[31.5, 74.3]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution="&copy; Google" />

                {isLoadingGeometries && (
                     <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-[1001]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     </div>
                )}
                {boundaryGeoJson && <GeoJSON data={boundaryGeoJson} style={{ color: "#dc2626", weight: 3, fill: false }} />}
                {parcelsGeoJson && <GeoJSON data={parcelsGeoJson} style={{ color: "#2563eb", weight: 1.5, fillOpacity: 0.1 }} />}
                {allGeoJson && <MapEffect geoJsonData={allGeoJson} />}
            </MapContainer>
            <PageHeader mauza={mauza} isLoading={isMauzaLoading} />
        </div>
    );
}
