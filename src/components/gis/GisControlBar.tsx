'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Download, Play, Server, ShieldAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface GisControlBarProps {
  title: React.ReactNode;
  hasSelection: boolean;
  isProcessing: boolean;
  geoData: any;
  colabUrl?: string;
  onRunStandard: () => void;
  onRunRealtime: () => void;
  onDownload: () => void;
  standardTab: {
    title: string;
    description: string;
    buttonText: string;
  };
  realtimeTab: {
    title: string;
    description: string;
    buttonText: string;
  };
}

export function GisControlBar({
  title,
  hasSelection,
  isProcessing,
  geoData,
  colabUrl,
  onRunStandard,
  onRunRealtime,
  onDownload,
  standardTab,
  realtimeTab,
}: GisControlBarProps) {
  const [activeTab, setActiveTab] = React.useState('standard');

  return (
    <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[95%] sm:w-auto">
      <Card className="rounded-xl border-slate-200/50 bg-white/80 shadow-2xl backdrop-blur-xl overflow-hidden">
        <motion.div layout className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center justify-start gap-3 sm:gap-6">
            {/* Section 1: Title */}
            <div className="flex-shrink-0 text-center sm:text-left">
              <h3 className="text-lg font-bold flex items-center justify-center sm:justify-start gap-2">{title}</h3>
              <AnimatePresence mode="wait">
                <motion.p
                  key={hasSelection ? 'selected' : 'unselected'}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-muted-foreground mt-1"
                >
                  {hasSelection ? 'Area selected. Choose an extraction method.' : 'Draw a polygon on the map to begin.'}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Separator */}
            <div className="hidden sm:block h-12 w-px bg-slate-200/80" />

            {/* Section 2: Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Tabs defaultValue="standard" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="standard">{standardTab.title}</TabsTrigger>
                  <TabsTrigger value="premium">{realtimeTab.title}</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {activeTab === 'standard' && (
                  <Button onClick={onRunStandard} disabled={!hasSelection || isProcessing} className="w-full sm:w-auto">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    {standardTab.buttonText}
                  </Button>
                )}
                {activeTab === 'premium' && (
                  <Button onClick={onRunRealtime} disabled={!hasSelection || isProcessing || !colabUrl} className="w-full sm:w-auto">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                    {realtimeTab.buttonText}
                  </Button>
                )}

                <AnimatePresence>
                {geoData && (
                    <motion.div initial={{opacity: 0, scale: 0.5}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0, scale: 0.5}}>
                        <Button onClick={onDownload} variant="outline" size="icon">
                            <Download className="h-4 w-4" />
                        </Button>
                    </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 pt-3 border-t border-slate-200/80"
            >
              {activeTab === 'standard' && <p className="text-xs text-muted-foreground text-center sm:text-left">{standardTab.description}</p>}
              {activeTab === 'premium' && (
                !colabUrl ? (
                    <Alert variant="destructive" className="p-2 text-xs">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle className="font-semibold">Server Not Configured</AlertTitle>
                        <AlertDescription>
                            The AGIS Realtime engine is unavailable. Go to Server Config to connect.
                        </AlertDescription>
                    </Alert>
                ) : (
                     <p className="text-xs text-muted-foreground text-center sm:text-left">{realtimeTab.description}</p>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </Card>
    </div>
  );
}
