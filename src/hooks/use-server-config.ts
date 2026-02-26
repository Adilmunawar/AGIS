'use client';

import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_KEY = 'agis_colab_url';

export function useServerConfig() {
  const [colabUrl, setColabUrl] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedUrl = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedUrl) {
        setColabUrl(storedUrl);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
    } finally {
        setIsLoaded(true);
    }
  }, []);

  const saveUrl = useCallback((newUrl: string) => {
    // Sanitize the URL: trim whitespace and remove trailing slashes
    const sanitizedUrl = newUrl.trim().replace(/\/+$/, '');
    
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, sanitizedUrl);
      setColabUrl(sanitizedUrl);
    } catch (error) {
      console.error("Could not write to localStorage:", error);
    }
  }, []);

  return { colabUrl, saveUrl, isLoaded };
}
