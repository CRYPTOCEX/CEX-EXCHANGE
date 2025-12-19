"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Code2,
  Server,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  Moon,
  Sun,
  Search,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTheme } from "next-themes";
import { useOpenAPI } from "./hooks/use-openapi";
import { Sidebar } from "./components/sidebar";
import { EndpointDetail } from "./components/endpoint-detail";
import { APIPlayground } from "./components/api-playground";

export default function APIDocsClient() {
  const [baseUrl, setBaseUrl] = useState("");
  const { theme, setTheme } = useTheme();

  // Initialize base URL
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const {
    spec,
    endpoints,
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
    refetch,
  } = useOpenAPI({ baseUrl });

  // Get unique tags from filtered endpoints
  const filteredTags = useMemo(() => {
    return Object.keys(filteredEndpointsByTag).sort();
  }, [filteredEndpointsByTag]);

  // Stats
  const stats = useMemo(() => {
    const methods = { get: 0, post: 0, put: 0, patch: 0, del: 0 };
    endpoints.forEach((e) => {
      const m = e.method.toLowerCase();
      if (m in methods) {
        methods[m as keyof typeof methods]++;
      }
    });
    return methods;
  }, [endpoints]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Loading API Documentation</h2>
            <p className="text-muted-foreground text-sm">
              Fetching OpenAPI specification...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <CardTitle>Failed to Load Documentation</CardTitle>
                <CardDescription>
                  Unable to fetch the API specification
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={refetch} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">API Documentation</h1>
              {spec?.info?.version && (
                <p className="text-xs text-muted-foreground">
                  v{spec.info.version}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats badges - hidden on mobile */}
            <div className="hidden md:flex items-center gap-1.5">
              <Badge variant="secondary" className="gap-1">
                <Code2 className="h-3 w-3" />
                {endpoints.length} endpoints
              </Badge>
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* Refresh button */}
            <Button variant="ghost" size="icon" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          endpoints={filteredEndpoints}
          endpointsByTag={filteredEndpointsByTag}
          tags={filteredTags}
          selectedEndpoint={selectedEndpoint}
          onSelectEndpoint={setSelectedEndpoint}
          search={search}
          onSearchChange={setSearch}
          methodFilters={methodFilters}
          onMethodFiltersChange={setMethodFilters}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-6 max-w-5xl mx-auto">
              {selectedEndpoint ? (
                /* Endpoint detail view */
                <div className="space-y-6">
                  <EndpointDetail endpoint={selectedEndpoint} baseUrl={baseUrl} />
                  <APIPlayground endpoint={selectedEndpoint} baseUrl={baseUrl} />
                </div>
              ) : (
                /* Welcome/overview view */
                <div className="space-y-8">
                  {/* Hero section */}
                  <div className="text-center py-8 lg:py-12">
                    <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
                      <BookOpen className="h-12 w-12 text-primary" />
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold mb-4">
                      {spec?.info?.title || "API Documentation"}
                    </h1>
                    {spec?.info?.description && (
                      <p className="text-muted-foreground max-w-2xl mx-auto">
                        {spec.info.description}
                      </p>
                    )}
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-500">
                            {stats.get}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            GET
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-500">
                            {stats.post}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            POST
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-amber-500">
                            {stats.put}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            PUT
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-orange-500">
                            {stats.patch}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            PATCH
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-red-500">
                            {stats.del}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            DEL
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Base URL */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Base URL
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="font-mono text-sm bg-muted p-4 rounded-lg">
                        {baseUrl}/api
                      </div>
                    </CardContent>
                  </Card>

                  {/* Getting started */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Getting Started
                      </CardTitle>
                      <CardDescription>
                        Quick steps to start using the API
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary font-bold">
                              1
                            </div>
                            <h3 className="font-medium">Authentication</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Get your API key from the settings and include it in
                            the X-API-Key header for all requests.
                          </p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary font-bold">
                              2
                            </div>
                            <h3 className="font-medium">Explore Endpoints</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Browse the sidebar to find endpoints. Use search and
                            filters to quickly locate what you need.
                          </p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary font-bold">
                              3
                            </div>
                            <h3 className="font-medium">Test & Integrate</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Use the API Playground to test endpoints, then copy
                            generated code to your application.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Features highlight */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                      <CardContent className="pt-6">
                        <Code2 className="h-8 w-8 text-blue-500 mb-3" />
                        <h3 className="font-semibold mb-1">Code Generation</h3>
                        <p className="text-sm text-muted-foreground">
                          Generate code snippets in cURL, JavaScript, Python, PHP,
                          Go, and Ruby.
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
                      <CardContent className="pt-6">
                        <Zap className="h-8 w-8 text-green-500 mb-3" />
                        <h3 className="font-semibold mb-1">API Playground</h3>
                        <p className="text-sm text-muted-foreground">
                          Test endpoints directly from the browser with real-time
                          responses.
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
                      <CardContent className="pt-6">
                        <Search className="h-8 w-8 text-purple-500 mb-3" />
                        <h3 className="font-semibold mb-1">Smart Search</h3>
                        <p className="text-sm text-muted-foreground">
                          Quickly find endpoints by path, method, tags, or
                          description.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
        </main>
      </div>
    </div>
  );
}
