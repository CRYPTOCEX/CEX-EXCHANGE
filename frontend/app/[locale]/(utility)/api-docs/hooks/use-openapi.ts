"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  OpenAPISpec,
  ParsedEndpoint,
  EndpointsByTag,
  HttpMethod,
  PathItemObject,
  OperationObject,
} from "../types/openapi";

interface UseOpenAPIOptions {
  baseUrl?: string;
}

interface UseOpenAPIReturn {
  spec: OpenAPISpec | null;
  endpoints: ParsedEndpoint[];
  endpointsByTag: EndpointsByTag;
  tags: string[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (search: string) => void;
  methodFilters: HttpMethod[];
  setMethodFilters: (methods: HttpMethod[]) => void;
  filteredEndpoints: ParsedEndpoint[];
  filteredEndpointsByTag: EndpointsByTag;
  selectedEndpoint: ParsedEndpoint | null;
  setSelectedEndpoint: (endpoint: ParsedEndpoint | null) => void;
  getEndpointById: (id: string) => ParsedEndpoint | undefined;
  refetch: () => Promise<void>;
}

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "delete", "del", "patch", "options", "head", "trace"];

export function useOpenAPI(options: UseOpenAPIOptions = {}): UseOpenAPIReturn {
  const { baseUrl = "" } = options;

  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [methodFilters, setMethodFilters] = useState<HttpMethod[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ParsedEndpoint | null>(null);

  const fetchSpec = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = baseUrl ? `${baseUrl}/api/docs/swagger.json` : "/api/docs/swagger.json";
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch API spec: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setSpec(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API documentation");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchSpec();
  }, [fetchSpec]);

  // Parse all endpoints from the spec
  const endpoints = useMemo<ParsedEndpoint[]>(() => {
    if (!spec?.paths) return [];

    const parsed: ParsedEndpoint[] = [];

    Object.entries(spec.paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;

      HTTP_METHODS.forEach((method) => {
        const operation = (pathItem as PathItemObject)[method] as OperationObject | undefined;
        if (operation) {
          const tags = operation.tags || ["Untagged"];
          parsed.push({
            id: `${method}-${path}`.replace(/[^a-zA-Z0-9-]/g, "-"),
            path,
            method,
            operation,
            tags,
          });
        }
      });
    });

    // Sort by path then method
    return parsed.sort((a, b) => {
      const pathCompare = a.path.localeCompare(b.path);
      if (pathCompare !== 0) return pathCompare;
      return HTTP_METHODS.indexOf(a.method) - HTTP_METHODS.indexOf(b.method);
    });
  }, [spec]);

  // Group endpoints by tag
  const endpointsByTag = useMemo<EndpointsByTag>(() => {
    const grouped: EndpointsByTag = {};

    endpoints.forEach((endpoint) => {
      endpoint.tags.forEach((tag) => {
        if (!grouped[tag]) {
          grouped[tag] = [];
        }
        grouped[tag].push(endpoint);
      });
    });

    return grouped;
  }, [endpoints]);

  // Get all unique tags
  const tags = useMemo(() => {
    return Object.keys(endpointsByTag).sort();
  }, [endpointsByTag]);

  // Filter endpoints based on search and method filters
  const filteredEndpoints = useMemo<ParsedEndpoint[]>(() => {
    let result = endpoints;

    // Filter by method
    if (methodFilters.length > 0) {
      result = result.filter((endpoint) => methodFilters.includes(endpoint.method));
    }

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      result = result.filter((endpoint) => {
        // Search in path
        if (endpoint.path.toLowerCase().includes(searchLower)) return true;
        // Search in method
        if (endpoint.method.toLowerCase().includes(searchLower)) return true;
        // Search in summary
        if (endpoint.operation.summary?.toLowerCase().includes(searchLower)) return true;
        // Search in description
        if (endpoint.operation.description?.toLowerCase().includes(searchLower)) return true;
        // Search in operation ID
        if (endpoint.operation.operationId?.toLowerCase().includes(searchLower)) return true;
        // Search in tags
        if (endpoint.tags.some((tag) => tag.toLowerCase().includes(searchLower))) return true;
        return false;
      });
    }

    return result;
  }, [endpoints, search, methodFilters]);

  // Group filtered endpoints by tag
  const filteredEndpointsByTag = useMemo<EndpointsByTag>(() => {
    const grouped: EndpointsByTag = {};

    filteredEndpoints.forEach((endpoint) => {
      endpoint.tags.forEach((tag) => {
        if (!grouped[tag]) {
          grouped[tag] = [];
        }
        // Avoid duplicates in same tag
        if (!grouped[tag].some((e) => e.id === endpoint.id)) {
          grouped[tag].push(endpoint);
        }
      });
    });

    return grouped;
  }, [filteredEndpoints]);

  // Get endpoint by ID
  const getEndpointById = useCallback(
    (id: string): ParsedEndpoint | undefined => {
      return endpoints.find((e) => e.id === id);
    },
    [endpoints]
  );

  return {
    spec,
    endpoints,
    endpointsByTag,
    tags,
    loading,
    error,
    search,
    setSearch,
    methodFilters,
    setMethodFilters,
    filteredEndpoints,
    filteredEndpointsByTag,
    selectedEndpoint,
    setSelectedEndpoint,
    getEndpointById,
    refetch: fetchSpec,
  };
}
