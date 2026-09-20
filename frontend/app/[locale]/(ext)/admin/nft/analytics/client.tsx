"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Coins,
  ShoppingCart,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Eye,
  BarChart3,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Info,
  AlertTriangle
} from "lucide-react";

// Import the professional analytics components
import ChartCard from "@/components/blocks/data-table/analytics/charts/line";
import BarChart from "@/components/blocks/data-table/analytics/charts/bar";
import { StatusDistribution } from "@/components/blocks/data-table/analytics/charts/donut";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { MoneyFigure } from "@/components/ui/money-figure";

interface AnalyticsData {
  overview: {
    totalCollections: number;
    totalTokens: number;
    totalListings: number;
    totalSales: number;
    totalVolume: number;
    totalUsers: number;
    totalActivity: number;
    avgPrice: number;
  };
  /*
    NULL, not zero, when the previous window was empty.

    Growth from nothing has no denominator, and the endpoint used to answer 0 —
    which is the claim that the figure was FLAT. Every read below is a
    truthiness check, so a null simply renders no delta chip.
  */
  trends: {
    collectionsGrowth: number | null;
    tokensGrowth: number | null;
    volumeGrowth: number | null;
    salesGrowth: number | null;
  };
  topCollections: Array<{
    id: string;
    name: string;
    /* Always "USD" now. It used to be the collection's OWN configured currency
       while `volume` was a raw sum across every denomination it had traded in,
       so this label was the thing that made the mixed number look credible. */
    currency: string;
    volume: number;
    sales: number;
    /* Null where the collection has no active fixed-price listing, or none that
       could be priced. Zero would read as "yours for nothing". */
    floorPrice: number | null;
  }>;
  topCreators: Array<{
    id: string;
    name: string;
    email: string;
    volume: number;
    sales: number;
    collections: number;
  }>;
  recentSales: Array<{
    id: string;
    tokenName: string;
    collectionName: string;
    price: number;
    currency: string;
    buyer: string;
    seller: string;
    timestamp: string;
  }>;
  chartData: {
    /* One point per day in the selected window, zero-filled, `volume` in USD.
       This key shipped as a permanently empty array for as long as the endpoint
       existed; it is now grouped out of `nft_sale`. */
    volumeChart: Array<{ date: string; volume: number; sales: number }>;
    categoryChart: Array<{ name: string; value: number; percentage: number }>;
    chainChart: Array<{ name: string; volume: number; collections: number }>;
    /*
      `chartData.trends` IS GONE, AND SO ARE SIX OF THE EIGHT SPARKLINES.

      It carried seven series — collections, tokens, volume, sales, users,
      listings, activity — every one of them generated server-side from
      `Math.random()` and re-rolled on each load, drawn UNDERNEATH the real KPI
      figures. Six of those quantities have no per-day history in the schema, so
      they are not re-guessed here: those tiles now show a figure and nothing
      else. The two that ARE recorded, volume and sales per day, read from
      `volumeChart` above.
    */
  };
  /* Denominations with no usable USD rate. Non-empty means every USD figure on
     this payload is a LOWER BOUND, and the banner below says so. */
  unpricedCurrencies: string[];
}

type TimeframeOption = '7d' | '30d' | '90d' | '1y';

/**
 * Categorical slots for the two donut charts.
 *
 * These used to be `hsl(${Math.random() * 360}, 70%, 50%)` — a fixed saturation
 * and lightness no theme could reach, AND a value that changed on every render,
 * so a category was a different colour each time the component re-rendered.
 * Module scope keeps the reference stable; the ramp keeps it themeable.
 */
const CATEGORY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export default function NFTAnalyticsDashboard() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const t = useTranslations("ext_admin");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');

  const fetchAnalyticsData = useCallback(async (selectedTimeframe?: TimeframeOption) => {
    try {
      setLoading(true);
      setError(null);

      const response = await $fetch({
        url: `/api/admin/nft/analytics`,
        params: {
          timeRange: selectedTimeframe || timeframe
        },
        silentSuccess: true,
      });

      // $fetch never throws, so the catch below is dead — surface the failure
      // here instead of falling through to an empty dashboard.
      if (response.error) {
        setError(
          typeof response.error === "string"
            ? response.error
            : t("failed_to_load_nft_analytics_data")
        );
      } else if (response.data) {
        setData(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching NFT analytics:", err);
      setError(err.message || t("failed_to_load_nft_analytics_data"));
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe: TimeframeOption) => {
    setTimeframe(newTimeframe);
    fetchAnalyticsData(newTimeframe);
  }, [fetchAnalyticsData]);

  const formatCurrency = useCallback((amount: number, currency: string = 'USD') => {
    // For crypto currencies, use proper decimal formatting
    if (currency !== 'USD') {
      if (amount < 0.01) {
        return `${amount.toFixed(8).replace(/\.?0+$/, '')} ${currency}`;
      } else {
        return `${amount.toFixed(4).replace(/\.?0+$/, '')} ${currency}`;
      }
    }
    // For USD, use currency formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  /*
    Helper to extract sparkline data from the daily volume series.

    It returns `[]` and never `undefined`, and that distinction is load-bearing:
    `StatsCard` reserves its 176px trend row on the PROP being present, not on
    the series having shape. Returning undefined for an absent series meant all
    eight tiles in this row stood at 130px while pending and grew to 176px the
    moment the trends arrived — a 46px jump across the whole KPI row, twice
    over (two rows of four), which is precisely what the card's `min-h-44`
    exists to prevent.

    It now reads `chartData.volumeChart`, which is real: the seven series it
    used to read came out of a server-side `Math.random()`.
  */
  const getSparklineData = useCallback(
    (
      points: Array<{ date: string; volume: number; sales: number }> | undefined,
      key: "volume" | "sales"
    ) => {
      if (!points || points.length === 0) return [];
      return points.map(point => ({ value: point[key], date: point.date }));
    },
    []
  );

  // Memoize chart configurations
  const chartConfigs = useMemo(() => ({
    /* The window in this title is now TRUE. The endpoint used to rank
       collections over ALL of history and hand them back under a heading that
       named the selected period; it now aggregates over the same window as
       every other figure on the page. */
    topCollections: {
      title: `Top Collections by Volume ${timeframe === '1y' ? '(12 Months)' : timeframe === '7d' ? '(7 Days)' : timeframe === '90d' ? '(90 Days)' : '(30 Days)'}`
    },
    salesVolume: {
      title: tCommon("trading_volume"),
      metrics: ["volume"],
      labels: { volume: tCommon("trading_volume") }
    },
    categoryDistribution: {
      title: tCommon("category_distribution")
    },
    chainDistribution: {
      title: t("blockchain_distribution")
    }
  }), [timeframe]);

  // Get timeframe display label
  const getTimeframeLabel = useCallback((tf: TimeframeOption) => {
    switch (tf) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
      default: return 'Last 30 Days';
    }
  }, []);

  /*
    A HAND-BUILT COPY OF THE PAGE, AND `if (!data) return null` BEHIND IT.
    ==========================================================================
    The pending branch drew the header out of four `Skeleton` boxes with
    hardcoded pixel widths (`h-9 w-[200px]` against a real `text-3xl` heading,
    `h-10 w-[150px]` against a `Select`), then eight KPI tiles out of
    `h-4`/`h-8`/`h-3` divs against `StatsCard`'s real 130.5px, then four
    `h-[300px]` chart boxes against `ChartCard`s that already reserve their own
    height. Six independent guesses, none of which can follow a change to the
    thing it imitates.

    Behind it sat `if (!data) return null` — a blank page — which the spinner
    had been shadowing. Removing the spinner without addressing that would have
    replaced a skeleton with NOTHING, so `view` supplies a zero-shaped payload
    for the pending frame: same eight tiles, same four charts, same tables,
    every figure through `loading`.
  */
  /* Failure is not pendency: `error` is null while the request runs, but
     naming the state says which of the three branches this is and stops the
     two being re-derived apart later. */
  const failed = !loading && !!error;

  if (failed) {
    return (
      <div className=" flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">{t("error_loading_nft_analytics")}</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => fetchAnalyticsData()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  /*
    `if (!data) return null` was a BLANK PAGE hiding behind the spinner.
    ------------------------------------------------------------------------
    Every read below is `data.overview.x` / `data.trends.x` / `data.chartData.x`,
    so the body needs an object, not a null check. `view` is that object: the
    real payload once it lands, and a zero-shaped one before — which is safe
    precisely because none of those zeroes reach the screen. The KPI figures go
    through `StatsCard`'s `loading`, and the charts through `ChartCard`'s, so
    what renders in the pending frame is the page's own chrome with measured
    placeholders in it.
  */
  const view: AnalyticsData =
    data ?? {
      overview: {
        totalCollections: 0,
        totalTokens: 0,
        totalListings: 0,
        totalSales: 0,
        totalVolume: 0,
        totalUsers: 0,
        totalActivity: 0,
        avgPrice: 0,
      },
      trends: {
        collectionsGrowth: null,
        tokensGrowth: null,
        volumeGrowth: null,
        salesGrowth: null,
      },
      topCollections: [],
      topCreators: [],
      recentSales: [],
      chartData: { volumeChart: [], categoryChart: [], chainChart: [] },
      unpricedCurrencies: [],
    };

  return (
    <div className=" space-y-8">
      {/* Header with Timeframe Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("nft_analytics")}</h1>
          <p className="text-muted-foreground">
            {t("comprehensive_marketplace_insights_and_performance")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={tCommon("select_timeframe")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{tCommon("last_7_days")}</SelectItem>
              <SelectItem value="30d">{tCommon("last_30_days")}</SelectItem>
              <SelectItem value="90d">{tCommon("last_90_days")}</SelectItem>
              <SelectItem value="1y">{t("last_year")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => fetchAnalyticsData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards using StatsCard components */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={t("total_collections")}
          value={formatNumber(view.overview.totalCollections)}
          icon={Package}
          index={0}
          change={view.trends.collectionsGrowth ? `${view.trends.collectionsGrowth > 0 ? "+" : ""}${view.trends.collectionsGrowth.toFixed(1)}%` : undefined}
          loading={loading}
          {...statsCardColors.purple}
        />
        <StatsCard
          label={tExt("total_nfts")}
          value={formatNumber(view.overview.totalTokens)}
          icon={Coins}
          index={1}
          change={view.trends.tokensGrowth ? `${view.trends.tokensGrowth > 0 ? "+" : ""}${view.trends.tokensGrowth.toFixed(1)}%` : undefined}
          loading={loading}
          {...statsCardColors.blue}
        />
        <StatsCard
          label={tCommon("trading_volume")}
          value={formatCurrency(view.overview.totalVolume)}
          icon={TrendingUp}
          index={2}
          change={view.trends.volumeGrowth ? `${view.trends.volumeGrowth > 0 ? "+" : ""}${view.trends.volumeGrowth.toFixed(1)}%` : undefined}
          sparklineData={getSparklineData(view.chartData.volumeChart, "volume")}
          timeframe={timeframe}
          loading={loading}
          {...statsCardColors.green}
        />
        <StatsCard
          label={tCommon("total_sales")}
          value={formatNumber(view.overview.totalSales)}
          icon={ShoppingCart}
          index={3}
          change={view.trends.salesGrowth ? `${view.trends.salesGrowth > 0 ? "+" : ""}${view.trends.salesGrowth.toFixed(1)}%` : undefined}
          sparklineData={getSparklineData(view.chartData.volumeChart, "sales")}
          timeframe={timeframe}
          loading={loading}
          {...statsCardColors.amber}
        />
        <StatsCard
          label={tCommon("active_users")}
          value={formatNumber(view.overview.totalUsers)}
          icon={Users}
          index={4}
          loading={loading}
          {...statsCardColors.cyan}
        />
        <StatsCard
          label={tCommon("average_price")}
          value={formatCurrency(view.overview.avgPrice)}
          icon={DollarSign}
          index={5}
          loading={loading}
          {...statsCardColors.pink}
        />
        <StatsCard
          label={tExt("active_listings")}
          value={formatNumber(view.overview.totalListings)}
          icon={Eye}
          index={6}
          loading={loading}
          {...statsCardColors.orange}
        />
        <StatsCard
          label={t("total_activity")}
          value={formatNumber(view.overview.totalActivity)}
          icon={Activity}
          index={7}
          loading={loading}
          {...statsCardColors.red}
        />
      </div>

      {/*
        A USD total with a non-empty `unpricedCurrencies` is a LOWER BOUND, not
        the marketplace's volume. The endpoint has always sent this list and
        nothing has ever rendered it, so an install selling in a currency with
        no rate row was shown a confident, silently incomplete figure.
      */}
      {view.unpricedCurrencies.length > 0 && (
        <p className="flex w-fit items-center gap-1.5 text-[11px] text-warning-ink">
          <Info className="h-3 w-3" />
          {t("volume_excludes_unpriced_currencies", {
            currencies: view.unpricedCurrencies.join(", "),
          })}
        </p>
      )}

      {/* Sales volume over the selected window. Real, and the only time series
          on this page that ever was — the seven that used to sit under the KPI
          tiles were random numbers. */}
      <ChartCard
        chartKey={`nft-volume-${timeframe}`}
        config={chartConfigs.salesVolume}
        data={view.chartData.volumeChart.some((point) => point.sales > 0)
          ? view.chartData.volumeChart
          : []}
        timeframe={timeframe}
        loading={loading}
      />

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Distribution */}
        <StatusDistribution
          data={view.chartData.categoryChart.map((item, index) => ({
            id: item.name,
            name: item.name,
            value: item.value,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
          }))}
          config={chartConfigs.categoryDistribution}
          loading={loading}
        />

        {/* Blockchain Distribution */}
        <StatusDistribution
          data={view.chartData.chainChart.map((item, index) => ({
            id: item.name,
            name: item.name,
            value: item.volume,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
          }))}
          config={chartConfigs.chainDistribution}
          loading={loading}
        />

        {/* Top Collections */}
        <Card>
          <CardHeader>
            <CardTitle>{chartConfigs.topCollections.title}</CardTitle>
            <CardDescription>
              {t("collections_ranked_by_trading_volume_in")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {view.topCollections.slice(0, 5).map((collection, index) => (
                <div key={collection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary-ink">
                      <span className="text-xs font-semibold font-mono tabular-nums">#{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">{collection.name}</h4>
                      <p className="text-[11px] text-subtle-foreground">
                        {formatNumber(collection.sales)} sales
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium"><MoneyFigure value={formatCurrency(collection.volume, collection.currency)} /></p>
                    {/* An em dash, not "$0.00": a collection with nothing listed
                        has no floor, and zero is a price. */}
                    <p className="text-[11px] text-subtle-foreground">
                      {tExt("floor")}: {collection.floorPrice === null
                        ? "—"
                        : formatCurrency(collection.floorPrice, collection.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="collections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="collections">{t("top_collections")}</TabsTrigger>
          <TabsTrigger value="creators">{t("top_creators")}</TabsTrigger>
          <TabsTrigger value="sales">{tExt("recent_sales")}</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              {/* NOT "All Collections Performance" / "Complete list of
                  collections". It is the top ten by volume and always was — a
                  ranked page presented as the population is the same defect as
                  ranking over one. The ranking itself is now computed in SQL
                  over every completed sale in the window, so "ranked by trading
                  volume in the selected time period" is finally accurate. */}
              <CardTitle>{t("top_collections")}</CardTitle>
              <CardDescription>
                {t("collections_ranked_by_trading_volume_in")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {view.topCollections.map((collection, index) => (
                  <div key={collection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary-ink">
                        <span className="text-xs font-semibold font-mono tabular-nums">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{collection.name}</h4>
                        <p className="text-[11px] text-subtle-foreground">
                          {formatNumber(collection.sales)} sales
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium"><MoneyFigure value={formatCurrency(collection.volume, collection.currency)} /></p>
                      <p className="text-[11px] text-subtle-foreground">
                        {tExt("floor")}: {collection.floorPrice === null
                          ? "—"
                          : formatCurrency(collection.floorPrice, collection.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("top_creators")}</CardTitle>
              <CardDescription>
                {t("creators_ranked_by_total_sales_volume")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {view.topCreators.map((creator, index) => (
                  <div key={creator.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary-ink">
                        <span className="text-xs font-semibold font-mono tabular-nums">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{creator.name}</h4>
                        <p className="text-[11px] text-subtle-foreground">{creator.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium font-mono tabular-nums">{formatCurrency(creator.volume)}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatNumber(creator.sales)} sales</span>
                        <span>•</span>
                        <span>{creator.collections} collections</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tExt("recent_sales")}</CardTitle>
              <CardDescription>
                {t("latest_nft_sales_transactions")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {view.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{sale.tokenName}</h4>
                      <p className="text-[11px] text-subtle-foreground">{sale.collectionName}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium"><MoneyFigure value={formatCurrency(sale.price, sale.currency)} /></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {sale.buyer} ← {sale.seller}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 