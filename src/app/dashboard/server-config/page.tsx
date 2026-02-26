'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';
import { CheckCircle, ExternalLink, Loader2, Server, ShieldX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
          title: 'Premium Engine Connected',
          description: 'Successfully connected to the external extraction server.',
        });
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
        setTestResult('fail');
        toast({
            variant: 'destructive',
            title: 'Server Offline',
            description: 'The Cloudflare link has expired or the Colab notebook is not running.',
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
            <CardTitle className="text-2xl font-bold">Premium Engine Configuration</CardTitle>
            <CardDescription className="mt-2 text-lg text-muted-foreground">
                Connect AGIS to your external Overture Maps extraction server.
            </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4 space-y-4">
            <div className="space-y-2">
                <label htmlFor="colab-url" className="text-sm font-medium text-foreground">Cloudflare Tunnel URL</label>
                 <div className="flex items-center gap-2">
                    <Input
                        id="colab-url"
                        placeholder="https://unique-id.trycloudflare.com"
                        value={currentUrl}
                        onChange={(e) => setCurrentUrl(e.target.value)}
                        className={cn(
                            testResult === 'success' && 'border-green-500 ring-green-500/50',
                            testResult === 'fail' && 'border-red-500 ring-red-500/50'
                        )}
                    />
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border">
                        {isTesting ? <Loader2 className="h-5 w-5 animate-spin"/> :
                         testResult === 'success' ? <CheckCircle className="h-5 w-5 text-green-500" /> :
                         testResult === 'fail' ? <ShieldX className="h-5 w-5 text-red-500" /> :
                         <Server className="h-5 w-5 text-muted-foreground"/>}
                    </div>
                </div>
            </div>
            
            <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertTitle>How to get the URL?</AlertTitle>
                <AlertDescription>
                    Run the provided Python script in your Google Colab notebook. It will output a public URL that you can paste here.
                </AlertDescription>
            </Alert>
        </CardContent>
        <CardFooter>
             <Button onClick={handleSaveAndTest} disabled={isTesting} className="w-full h-12 text-lg">
                {isTesting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Testing...</> : 'Save & Test Connection'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    