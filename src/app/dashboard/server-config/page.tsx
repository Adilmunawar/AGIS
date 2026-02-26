'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';
import { CheckCircle, ExternalLink, Loader2, Server, ShieldX, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ServerConfigPage() {
  const { colabUrl, saveUrl, isLoaded } = useServerConfig();
  const [currentUrl, setCurrentUrl] = useState(colabUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoaded) {
      setCurrentUrl(colabUrl);
    }
  }, [colabUrl, isLoaded]);

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    saveUrl(currentUrl);

    const urlToTest = currentUrl.trim().replace(/\/+$/, '');
    if (!urlToTest) {
      toast({
        variant: 'destructive',
        title: 'URL is Empty',
        description: 'Please provide a valid server URL.',
      });
      setIsTesting(false);
      setTestResult('fail');
      return;
    }

    try {
      const response = await fetch(`${urlToTest}/health`);
      if (response.ok) {
        setTestResult('success');
        toast({
          title: 'AGIS Realtime Engine Connected',
          description: 'Successfully connected to the external extraction server.',
        });
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      setTestResult('fail');
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'Could not connect. Ensure the backend script is running and the URL is correct.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100/50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const instructions = [
    "Open the AGIS Backend notebook using the button below.",
    "Run the single script cell. It will install dependencies and start the server automatically.",
    "The script will generate and display a secure public URL ending in `.trycloudflare.com`.",
    "Copy this URL and paste it into the input field below.",
    "Click 'Save & Test Connection' to link your application to the backend."
  ];

  return (
    <div className="flex h-full w-full items-start justify-center bg-gray-100/50 p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-3xl space-y-8">
            <Card className="bg-white/90 backdrop-blur-md shadow-lg border-slate-200/50">
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">Backend Service Initialization</CardTitle>
                            <CardDescription className="mt-1">Follow these steps to connect the AGIS Realtime geospatial engine.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Button asChild variant="outline" className="w-full justify-center gap-2">
                        <Link href="https://colab.research.google.com/drive/1VxcUK53FtsjzfMAMtsxKq5CmiYv9nUI6?usp=sharing" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Open AGIS Backend Notebook
                        </Link>
                    </Button>
                    <div className="space-y-4">
                        {instructions.map((step, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                    {index + 1}
                                </div>
                                <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-md shadow-lg border-slate-200/50">
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                           <Server className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">Endpoint Configuration</CardTitle>
                            <CardDescription className="mt-1">Paste the tunnel URL from your Colab notebook here.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <label htmlFor="colab-url" className="text-sm font-medium text-foreground">Backend Tunnel URL</label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="colab-url"
                                placeholder="https://....trycloudflare.com"
                                value={currentUrl}
                                onChange={(e) => setCurrentUrl(e.target.value)}
                                className={cn(
                                    testResult === 'success' && 'border-green-500 focus-visible:ring-green-500/50',
                                    testResult === 'fail' && 'border-red-500 focus-visible:ring-red-500/50'
                                )}
                            />
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                                {isTesting ? <Loader2 className="h-5 w-5 animate-spin"/> :
                                testResult === 'success' ? <CheckCircle className="h-5 w-5 text-green-500" /> :
                                testResult === 'fail' ? <ShieldX className="h-5 w-5 text-red-500" /> :
                                <Server className="h-5 w-5 text-muted-foreground"/>}
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveAndTest} disabled={isTesting || !currentUrl} className="w-full h-11 text-base">
                        {isTesting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</> : 'Save & Test Connection'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
