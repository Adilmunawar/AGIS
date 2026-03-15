
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { MauzaMetadata } from '@/types/gis-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Layers, Square, MapPin, Database, ServerCrash, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function StatCard({ title, value, icon: Icon, isLoading, unit }: { title: string; value: string; icon: React.ElementType; isLoading: boolean; unit?: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className="text-3xl font-bold">
            {value}
            {unit && <span className="text-lg font-medium text-muted-foreground ml-1">{unit}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MauzaCard({ mauza }: { mauza: MauzaMetadata }) {
    return (
        <Link href={`/dashboard/parcels-database/${mauza.id}`} className="block">
            <Card className="group transition-all duration-300 hover:border-primary hover:shadow-primary/10 hover:-translate-y-1">
                <CardHeader className="flex-row items-center justify-between p-4">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-bold group-hover:text-primary">{mauza.name}</CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="h-3 w-3"/> {mauza.district}, {mauza.tehsil}
                        </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                        <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-md bg-muted/70 p-2">
                            <p className="font-bold text-sm text-foreground">{mauza.totalParcels.toLocaleString()}</p>
                            <p className="text-muted-foreground font-medium">Parcels</p>
                        </div>
                        <div className="rounded-md bg-muted/70 p-2">
                             <p className="font-bold text-sm text-foreground">{(mauza.totalAreaAcres || 0).toLocaleString()}</p>
                            <p className="text-muted-foreground font-medium">Acres</p>
                        </div>
                         <div className="rounded-md bg-muted/70 p-2">
                            <p className="font-bold text-sm text-foreground truncate">{mauza.hudbust_no}</p>
                            <p className="text-muted-foreground font-medium">Hudbust</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
    return (
        <div className="text-center py-16 col-span-1 md:col-span-2 lg:col-span-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                {hasSearch ? <Search className="h-8 w-8 text-muted-foreground" /> : <Database className="h-8 w-8 text-muted-foreground" />}
            </div>
            <h3 className="mt-4 text-lg font-semibold">
                {hasSearch ? "No Mauzas Found" : "No Mauzas in Database"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
                {hasSearch ? "Try adjusting your search term." : "Upload a shapefile from the 'Import Parcels' tab to get started."}
            </p>
        </div>
    );
}

function ErrorState() {
     return (
        <div className="text-center py-16 text-destructive col-span-1 md:col-span-2 lg:col-span-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <ServerCrash className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Error Fetching Data</h3>
            <p className="mt-2 text-sm">
                Could not connect to the database. Check your Firestore security rules and network connection.
            </p>
        </div>
    );
}

export default function ParcelsDatabasePage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const mauzasQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'Mauzas'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: mauzas, isLoading, error } = useCollection<MauzaMetadata>(mauzasQuery);

  const filteredMauzas = useMemo(() => {
    if (!mauzas) return [];
    const term = searchTerm.toLowerCase();
    if (!term) return mauzas;
    return mauzas.filter(m => 
        m.name.toLowerCase().includes(term) ||
        m.district.toLowerCase().includes(term) ||
        m.tehsil.toLowerCase().includes(term)
    );
  }, [mauzas, searchTerm]);

  const stats = useMemo(() => {
    const sourceData = filteredMauzas || [];
    return {
      totalMauzas: sourceData.length,
      totalParcels: sourceData.reduce((acc, m) => acc + (m.totalParcels || 0), 0),
      totalArea: sourceData.reduce((acc, m) => acc + (m.totalAreaAcres || 0), 0),
    };
  }, [filteredMauzas]);

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <header className="border-b bg-background p-4 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-xl font-bold tracking-tight">Parcels Database</h1>
                <p className="text-sm text-muted-foreground">
                  A centralized repository of all uploaded cadastral datasets.
                </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, district, tehsil..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Showing Mauzas" value={stats.totalMauzas.toLocaleString()} icon={Package} isLoading={isLoading} />
                <StatCard title="Total Parcels" value={stats.totalParcels.toLocaleString()} icon={Layers} isLoading={isLoading} />
                <StatCard title="Total Area" value={stats.totalArea.toLocaleString(undefined, { maximumFractionDigits: 0 })} unit="Acres" icon={Square} isLoading={isLoading} />
            </div>
            
            <div>
                <h2 className="text-lg font-semibold mb-3 px-1">All Mauzas</h2>
                 {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full"/>)}
                    </div>
                ) : error ? (
                    <ErrorState />
                ) : filteredMauzas.length === 0 ? (
                    <EmptyState hasSearch={!!searchTerm} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMauzas.map(mauza => (
                            <MauzaCard key={mauza.id} mauza={mauza} />
                        ))}
                    </div>
                )}
            </div>
        </div>
      </ScrollArea>
    </div>
  );
}
