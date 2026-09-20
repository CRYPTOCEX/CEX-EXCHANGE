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
  AlertCircle,
  RefreshCw,
  Zap,
  Moon,
  Sun,
  Search,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Loadable } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useOpenAPI } from "./hooks/use-openapi";
import { Sidebar } from "./components/sidebar";
import { EndpointDetail } from "./components/endpoint-detail";
import { APIPlayground } from "./components/api-playground";
import { METHOD_INK } from "./components/method-badge";
import { useTranslations } from "next-intl";

/**
 * A card whose only content is an accent-tiled icon, a heading and one line of
 * copy. It was written out six times on this page — three "getting started"
 * steps and three feature cards — differing only in the glyph and the copy, so
 * the hues drifted apart (blue / green / purple, plus three gradients faking
 * elevation that R3 forbids). One accent, one shape, six call sites.
 */
function InfoCard({
  mark,
  title,
  body,
}: {
  mark: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary-ink">
          {mark}
        </div>
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export default function APIDocsClient() {
  const t = useTranslations("utility_api-docs");
  const tCommon = useTranslations("common");
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

  // Copy for the overview cards. `t("...")` stays a literal call so the i18n
  // key scraper still finds every key.
  const steps = [
    { n: 1, title: t("authentication"), body: t("get_your_api_key_from_the") },
    { n: 2, title: t("explore_endpoints"), body: t("browse_the_sidebar_to_find_endpoints") },
    { n: 3, title: t("test_integrate"), body: t("use_the_api_playground_to_test") },
  ];

  const features = [
    {
      icon: Code2,
      title: t("code_generation"),
      body: t("generate_code_snippets_in_curl_javascript"),
    },
    {
      icon: Zap,
      title: t("api_playground"),
      body: t("test_endpoints_directly_from_the_browser"),
    },
    {
      icon: Search,
      title: t("smart_search"),
      body: t("quickly_find_endpoints_by_path_method"),
    },
  ];

  /*
    THE LOADING SWAP IS GONE — it was the whole page, twice over.
    ==========================================================================

    What used to be here: `if (loading) return <div className="min-h-screen
    flex items-center justify-center"><Loader2 .../></div>`. A 48px spinner
    centred in the viewport, standing in for a three-region app shell — a
    64px header, a 320px sidebar column, and a scrolling main. Nothing about
    that shell is unknown before the fetch: the back button, the title, the
    theme toggle, the refresh button, the search box, the method filter, the
    five method tiles, the base-URL card and both info-card grids are all
    static. Only six values wait on the spec, and every one of them is a
    string or a count.

    So the shell now renders immediately and the six values carry
    placeholders. The `min-h-screen` fallback was also the reason this file
    scored 54 — a full-viewport swap is weighted x3 by the scanner, and
    rightly: on arrival the ENTIRE viewport reflowed, header included.

    The ERROR return below stays a swap on purpose. It is a different state,
    not a pending one — "the spec could not be fetched" has no partial
    rendering, and `error` is only ever set once `loading` has gone false
    (`fetchSpec` sets `loading` true and `error` null in the same tick, so
    there is no frame where both are truthy).
  */

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle>{t("failed_to_load_documentation")}</CardTitle>
                <CardDescription>
                  {t("unable_to_fetch_the_api_specification")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={refetch} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              {tCommon("try_again")}
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
              <h1 className="font-semibold">{tCommon("api_documentation")}</h1>
              {/* `info.version` is REQUIRED by the OpenAPI specification and
                  our own generator hardcodes it (`backend/src/docs.ts`), so
                  the version line is knowable to EXIST before the fetch even
                  if its text is not. Gating it on `spec?.info?.version` meant
                  the 16px line appeared underneath the title on arrival and
                  re-centred the whole title block inside the 64px header. */}
              <p className="text-xs text-muted-foreground">
                v
                <Loadable loading={loading} placeholder="1.0.0">
                  {spec?.info?.version}
                </Loadable>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats badges - hidden on mobile */}
            <div className="hidden md:flex items-center gap-1.5">
              <Badge variant="secondary" className="gap-1">
                <Code2 className="h-3 w-3" />
                {/* `endpoints` is `[]` until the spec parses, so this read
                    "0 endpoints" for the whole fetch — a confident count, and
                    the wrong one. */}
                <Loadable loading={loading} placeholder="000">
                  {endpoints.length}
                </Loadable>{" "}
                endpoints
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
          loading={loading}
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
                      {/* NOT `|| "API Documentation"`. That fallback printed a
                          confident, wrong title for the whole fetch and then
                          swapped it for the site's own name — the generator
                          uses `SITE_NAME`, so on every branded install the
                          heading visibly changed text after paint. */}
                      <Loadable loading={loading} placeholder={tCommon("api_documentation")}>
                        {spec?.info?.title}
                      </Loadable>
                    </h1>
                    {/* Our generator always emits `info.description`, so this
                        paragraph exists in both states; withholding it grew
                        the hero by one 24px line at the exact moment the five
                        method tiles below it were also settling. */}
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      <Loadable
                        loading={loading}
                        placeholder={t("complete_reference_for_every_rest_endpoint")}
                      >
                        {spec?.info?.description}
                      </Loadable>
                    </p>
                  </div>

                  {/* Quick stats — one tile per method, sharing the badge's
                      hue assignment so a method is the same colour here, in the
                      sidebar and on the endpoint header. */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {(Object.keys(stats) as Array<keyof typeof stats>).map((method) => (
                      <Card key={method}>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            {/* `stats` is derived from `endpoints`, which is
                                `[]` until the spec parses — so all five tiles
                                read a confident `0` while loading, i.e. "this
                                API has no endpoints". */}
                            <div className={cn("text-3xl font-bold font-mono tabular-nums", METHOD_INK[method])}>
                              <Loadable loading={loading} placeholder="000">
                                {stats[method]}
                              </Loadable>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 font-mono uppercase">
                              {method}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Base URL */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        {tCommon("base_url")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* `baseUrl` is `window.location.origin`, set in an
                          effect, so the first client paint had no origin and
                          this box read a bare "/api". Same box, same padding,
                          only the origin waits. */}
                      <div className="font-mono text-sm bg-muted p-4 rounded-lg">
                        <Loadable loading={!baseUrl} placeholder="https://example.com">
                          {baseUrl}
                        </Loadable>
                        /api
                      </div>
                    </CardContent>
                  </Card>

                  {/* Getting started */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        {tCommon("getting_started")}
                      </CardTitle>
                      <CardDescription>
                        {t("quick_steps_to_start_using_the_api")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        {steps.map((step) => (
                          <InfoCard
                            key={step.n}
                            mark={step.n}
                            title={step.title}
                            body={step.body}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Features highlight. Three peer capabilities of one page —
                      not a category set — so they share the accent and are told
                      apart by their glyph and heading (R2). The gradients they
                      used to carry were faking elevation (R3). */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {features.map((feature) => (
                      <InfoCard
                        key={feature.title}
                        mark={<feature.icon className="h-4 w-4" />}
                        title={feature.title}
                        body={feature.body}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
        </main>
      </div>
    </div>
  );
}
