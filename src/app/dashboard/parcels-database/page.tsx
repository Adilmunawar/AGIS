
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { MauzaMetadata } from '@/types/gis-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Layers, Square, MapPin, Database, ServerCrash } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

function StatCard({ title, value, icon: Icon, isLoading }: { title: string; value: string; icon: React.ElementType; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-1/2" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function MauzaCard({ mauza }: { mauza: MauzaMetadata }) {
    return (
        <Card className="hover:border-primary/50 hover:shadow-md transition-all">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{mauza.name}</CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3"/> {mauza.district}, {mauza.tehsil}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg text-primary">{mauza.totalParcels}</p>
                        <p className="text-xs text-muted-foreground -mt-1">Parcels</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <p>Hudbust: <span className="font-semibold">{mauza.hudbust_no}</span></p>
                    <Button asChild size="sm" variant="outline" className="h-8">
                        <Link href={`/dashboard/parcels-database/${mauza.id}`}>View Details</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

function EmptyState() {
    return (
        <div className="text-center py-16">
            <Database className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Mauzas in Database</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                Upload a shapefile from the 'Import Parcels' tab to get started.
            </p>
        </div>
    );
}

function ErrorState() {
     return (
        <div className="text-center py-16 text-destructive">
            <ServerCrash className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">Error Fetching Data</h3>
            <p className="mt-2 text-sm">
                Could not connect to the database. Check your Firestore security rules and network connection.
            </p>
        </div>
    );
}

export default function ParcelsDatabasePage() {
  const firestore = useFirestore();
  const mauzasQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'Mauzas'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: mauzas, isLoading, error } = useCollection<MauzaMetadata>(mauzasQuery);

  const stats = useMemo(() => {
    if (!mauzas) return { totalMauzas: 0, totalParcels: 0, totalArea: 0 };
    return {
      totalMauzas: mauzas.length,
      totalParcels: mauzas.reduce((acc, m) => acc + (m.totalParcels || 0), 0),
      totalArea: 0, // This needs to be implemented.
    };
  }, [mauzas]);

  return (
    <div className="flex h-full flex-col bg-muted/20">
      <header className="border-b bg-background p-4">
        <h1 className="text-xl font-bold tracking-tight">Parcels Database</h1>
        <p className="text-sm text-muted-foreground">
          A centralized repository of all uploaded cadastral datasets (Mauzas).
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        <div className="grid gap-4 md:grid-cols-3 h-full">
            <div className="col-span-3">
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard title="Total Mauzas" value={stats.totalMauzas.toLocaleString()} icon={Package} isLoading={isLoading} />
                    <StatCard title="Total Parcels" value={stats.totalParcels.toLocaleString()} icon={Layers} isLoading={isLoading} />
                    <StatCard title="Total Area (Acres)" value="0" icon={Square} isLoading={isLoading} />
                </div>
            </div>
            
            <div className="col-span-3 flex flex-col min-h-0">
                <h2 className="text-lg font-semibold mb-2">All Mauzas</h2>
                <ScrollArea className="flex-1 -mr-3">
                    <div className="space-y-4 pr-3">
                        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full"/>)}
                        {!isLoading && error && <ErrorState />}
                        {!isLoading && !error && mauzas?.length === 0 && <EmptyState />}
                        {!isLoading && !error && mauzas && mauzas.map(mauza => (
                            <MauzaCard key={mauza.id} mauza={mauza} />
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
      </div>
    </div>
  );
}
