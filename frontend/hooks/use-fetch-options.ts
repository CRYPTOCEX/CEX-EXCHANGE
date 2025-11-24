// File: /hooks/use-fetch-options.ts

import { useEffect, useState } from "react";
import { $fetch } from "@/lib/api"; // your custom $fetch function

interface ApiEndpoint {
  url: string;
  method?: any;
  params?: Record<string, any>;
  body?: Record<string, any>;
}

interface Option {
  value: string;
  label: string;
}

// A simple in-memory cache (keyed by URL; you can extend this if needed)
const optionsCache: Record<string, { options: Option[]; timestamp: number }> =
  {};

// Set cache duration (in milliseconds). For example, 5 minutes.
const CACHE_DURATION = 5 * 60 * 1000;

export function useFetchOptions(apiEndpoint?: ApiEndpoint | null) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiEndpoint) return; // If there's no endpoint, do nothing

    const cacheKey = apiEndpoint.url; // You could include method/params if needed.
    const now = Date.now();

    // Check cache
    if (
      optionsCache[cacheKey] &&
      now - optionsCache[cacheKey].timestamp < CACHE_DURATION
    ) {
      setOptions(optionsCache[cacheKey].options);
      setLoading(false);
      return; // Use cached data; skip fetching.
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        if (!apiEndpoint) return;
        const { data, error: fetchErr } = await $fetch({
          url: apiEndpoint.url,
          method: apiEndpoint.method,
          params: apiEndpoint.params,
          body: apiEndpoint.body,
          silent: true,
        });

        if (fetchErr) {
          throw new Error(fetchErr);
        }

        // Expect an array response for select options.
        if (!Array.isArray(data)) {
          throw new Error("Expected array response for select options");
        }

        const fetchedOptions = data.map((item: any) => {
          // Accept mapping: id > name, value > label, id > label, or value > name.
          if ("id" in item && "name" in item) {
            return { value: item.id?.toString() || "", label: item.name };
          } else if ("value" in item && "label" in item) {
            return { value: item.value, label: item.label };
          } else if ("id" in item && "label" in item) {
            return { value: item.id?.toString() || "", label: item.label };
          } else if ("value" in item && "name" in item) {
            return { value: item.value, label: item.name };
          } else {
            throw new Error("Unexpected data format for select options");
          }
        });

        if (mounted) {
          setOptions(fetchedOptions);
          // Cache the result with a timestamp.
          optionsCache[cacheKey] = {
            options: fetchedOptions,
            timestamp: Date.now(),
          };
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Error fetching options"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [apiEndpoint]);

  return { options, loading, error };
}
