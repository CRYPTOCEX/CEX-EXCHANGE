"use client";

import { useEffect, useState } from "react";

interface TradingViewScriptLoaderProps {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function TradingViewScriptLoader({ onLoad, onError }: TradingViewScriptLoaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if TradingView is already loaded
    if (typeof window !== "undefined" && window.TradingView && window.TradingView.widget) {
      setIsLoaded(true);
      onLoad?.();
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="charting_library.standalone.js"]');
    if (existingScript) {
      // Wait for existing script to load
      existingScript.addEventListener('load', () => {
        setIsLoaded(true);
        onLoad?.();
      });
      existingScript.addEventListener('error', (e) => {
        const error = new Error('Failed to load TradingView library');
        setError(error);
        onError?.(error);
      });
      return;
    }

    // Load the script dynamically
    setIsLoading(true);
    const script = document.createElement('script');
    script.src = '/lib/chart/charting_library/charting_library/charting_library.standalone.js';
    script.async = true;

    script.onload = () => {
      // Add a small delay to ensure the global object is fully initialized
      setTimeout(() => {
        if (window.TradingView && window.TradingView.widget) {
          setIsLoading(false);
          setIsLoaded(true);
          onLoad?.();
        } else {
          setTimeout(() => {
            if (window.TradingView && window.TradingView.widget) {
              setIsLoading(false);
              setIsLoaded(true);
              onLoad?.();
            } else {
              const error = new Error('TradingView widget not available');
              setError(error);
              onError?.(error);
            }
          }, 100);
        }
      }, 50);
    };

    script.onerror = (e) => {
      setIsLoading(false);
      const error = new Error('Failed to load TradingView library');
      setError(error);
      onError?.(error);
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [onLoad, onError]);

  return null; // This component doesn't render anything
}

// Hook for using TradingView script loader
export function useTradingViewLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if already loaded
    if (typeof window !== "undefined" && window.TradingView && window.TradingView.widget) {
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);

    const handleLoad = () => {
      // Add a small delay to ensure the global object is fully initialized
      setTimeout(() => {
        if (window.TradingView && window.TradingView.widget) {
          setIsLoading(false);
          setIsLoaded(true);
          setError(null);
        } else {
          setTimeout(() => {
            if (window.TradingView && window.TradingView.widget) {
              setIsLoading(false);
              setIsLoaded(true);
              setError(null);
            } else {
              handleError(new Error('TradingView widget not available'));
            }
          }, 100);
        }
      }, 50);
    };

    const handleError = (err: Error) => {
      setIsLoading(false);
      setError(err);
    };

    // Create a temporary component to handle loading
    const loader = document.createElement('div');
    document.body.appendChild(loader);

    // Use the script loader
    const script = document.createElement('script');
    script.src = '/lib/chart/charting_library/charting_library/charting_library.standalone.js';
    script.async = true;
    script.onload = handleLoad;
    script.onerror = () => handleError(new Error('Failed to load TradingView'));

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="charting_library.standalone.js"]');
    if (!existingScript) {
      document.head.appendChild(script);
    } else {
      handleLoad();
    }

    return () => {
      document.body.removeChild(loader);
    };
  }, []);

  return { isLoaded, isLoading, error };
} 