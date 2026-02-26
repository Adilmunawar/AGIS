'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';
import { CheckCircle, ExternalLink, Loader2, Server } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ServerConfigPage() {
  const { colabUrl, saveUrl, isLoaded } = useServerConfig();
  const [currentUrl, setCurrentUrl] = useState(colabUrl);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoaded) {
      setCurrentUrl(colabUrl);
    }
  }, [colabUrl, isLoaded]);

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    saveUrl(currentUrl);

    // Give state a moment to update before testing
    const urlToTest = currentUrl.trim().replace(/\/+$/, '');
    if (!urlToTest) {
        toast({
            variant: 'destructive',
            title: 'URL is Empty',
            description: 'Please provide a valid Colab server URL.',
        });
        setIsTesting(false);
        return;
    }
    
    try {
      // The provided backend doesn't have `/health`. Let's hit the root.
      const response = await fetch(urlToTest);

      if (response.ok) {
        toast({
          title: 'Connection Successful',
          description: 'Successfully connected to the Premium AI Engine.',
          action: (
            <div className="p-1 rounded-md bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          )
        });
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Server Offline',
            description: 'The Colab link has expired or the notebook is disconnected. Please restart Colab and enter the new link.',
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

  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100/50 p-4 sm:p-8">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                <Server className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">External AI Server Configuration</CardTitle>
            <CardDescription className="mt-2 text-lg text-muted-foreground">
                Connect AGIS to the Colab GPU engine for premium features.
            </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4 space-y-6">
            <div className="space-y-2">
                <label htmlFor="colab-url" className="text-sm font-medium text-foreground">Colab Server URL</label>
                <Input
                    id="colab-url"
                    placeholder="https://unique-id.ngrok-free.app"
                    value={currentUrl}
                    onChange={(e) => setCurrentUrl(e.target.value)}
                />
            </div>
            
            <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertTitle>How to get the URL?</AlertTitle>
                <AlertDescription>
                    Run the provided Python script in your Google Colab notebook. It will output a public URL that you can paste here.
                </AlertDescription>
            </Alert>
            
            <Button onClick={handleSaveAndTest} disabled={isTesting} className="w-full h-12 text-lg">
                {isTesting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Testing...</> : 'Save & Test Connection'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
