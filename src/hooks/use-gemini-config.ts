'use client';

import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_KEY = 'agis_gemini_key';

export function useGeminiConfig() {
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedKey) {
        setGeminiApiKey(storedKey);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
    } finally {
        setIsLoaded(true);
    }
  }, []);

  const saveKey = useCallback((newKey: string) => {
    const sanitizedKey = newKey.trim();
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, sanitizedKey);
      setGeminiApiKey(sanitizedKey);
    } catch (error) {
      console.error("Could not write to localStorage:", error);
    }
  }, []);

  return { geminiApiKey, saveKey, isLoaded };
}
