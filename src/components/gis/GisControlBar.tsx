'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Download, Play, Server, ShieldAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface GisControlBarProps {
  title: React.ReactNode;
  hasSelection: boolean;
  isProcessing: boolean;
  geoData: any;
  colabUrl?: string;
  statusMessage: string | null;
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
  statusMessage,
  onRunStandard,
  onRunRealtime,
  onDownload,
  standardTab,
  realtimeTab,
}: GisControlBarProps) {
  const [activeTab, setActiveTab] = React.useState('standard');

  return (
    <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-auto max-w-[95%] flex flex-col items-center gap-2">
      <Card className="rounded-xl border-slate-200/50 bg-white/80 shadow-2xl backdrop-blur-xl overflow-hidden">
        <motion.div layout className="p-2">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 flex items-center gap-2 font-medium text-foreground">{title}</div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={hasSelection ? 'selected' : 'unselected'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-muted-foreground hidden sm:block"
                >
                  {hasSelection ? 'Area selected.' : 'Draw a polygon to begin.'}
                </motion.p>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {hasSelection && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-wrap items-center justify-center gap-3"
                >
                  <Tabs defaultValue="standard" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="standard">{standardTab.title}</TabsTrigger>
                      <TabsTrigger value="realtime">{realtimeTab.title}</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <span tabIndex={0}>
                            <motion.div
                              key={activeTab + (colabUrl ? '1' : '0')}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                            >
                              {activeTab === 'standard' ? (
                                <Button onClick={onRunStandard} disabled={isProcessing} size="sm">
                                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                  {standardTab.buttonText}
                                </Button>
                              ) : !colabUrl ? (
                                <Button variant="outline" size="sm" disabled style={{pointerEvents: 'none'}}>
                                  <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />
                                  Server Not Connected
                                </Button>
                              ) : (
                                <Button onClick={onRunRealtime} disabled={isProcessing} size="sm">
                                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                                  {realtimeTab.buttonText}
                                </Button>
                              )}
                            </motion.div>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p className="text-xs max-w-xs">
                            {activeTab === 'standard'
                                ? standardTab.description
                                : !colabUrl
                                ? 'AGIS Realtime engine is unavailable. Please configure it on the Server Config page.'
                                : realtimeTab.description
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {geoData && (
                      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                        <Button onClick={onDownload} variant="outline" size="icon" className="h-9 w-9">
                          <Download className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </Card>
      
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 rounded-full border border-slate-200/50 bg-white/80 px-4 py-1.5 text-xs shadow-lg backdrop-blur-xl"
          >
            {isProcessing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <p className="text-muted-foreground">{statusMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
