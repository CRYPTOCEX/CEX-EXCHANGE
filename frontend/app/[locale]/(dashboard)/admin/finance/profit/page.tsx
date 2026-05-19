"use client";
import DataTable from "@/components/blocks/data-table";
import {
  Wallet,
  TrendingUp,
  Calendar,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

interface ProfitSummary {
  totalsByWalletType: Record<
    string,
    Record<
      string,
      { total: number; walletId: string; walletBalance: number; available: number }
    >
  >;
  totalsByType: Record<string, { total: number; count: number }>;
  totalsByCurrency: Record<string, { total: number; count: number }>;
  periodComparison: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
  trackingSince: string | null;
  adminId: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(n < 1 && n > 0 ? 6 : 2);
}

function ProfitSummaryDashboard() {
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await $fetch({
        url: "/api/admin/finance/profit/summary",
        silent: true,
      });
      if (!res.error && res.data) {
        setSummary(res.data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Failed to load profit summary.
          </p>
          <button
            onClick={fetchSummary}
            className="text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const { periodComparison, totalsByWalletType, totalsByType, totalsByCurrency } =
    summary;

  const monthChange =
    periodComparison.lastMonth > 0
      ? ((periodComparison.thisMonth - periodComparison.lastMonth) /
          periodComparison.lastMonth) *
        100
      : 0;

  const walletTypes = Object.keys(totalsByWalletType);
  const topTypes = Object.entries(totalsByType)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 6);
  const topCurrencies = Object.entries(totalsByCurrency)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8);

  return (
    <div className="space-y-4 mb-6">
      {/* Period Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-lg font-semibold">
                  {formatNumber(periodComparison.today)}
                </p>
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-lg font-semibold">
                  {formatNumber(periodComparison.thisWeek)}
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-lg font-semibold">
                  {formatNumber(periodComparison.thisMonth)}
                </p>
              </div>
              {monthChange >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
            </div>
            {periodComparison.lastMonth > 0 && (
              <p
                className={`text-xs mt-1 ${
                  monthChange >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {monthChange >= 0 ? "+" : ""}
                {monthChange.toFixed(1)}% vs last month
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Last Month</p>
                <p className="text-lg font-semibold">
                  {formatNumber(periodComparison.lastMonth)}
                </p>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Wallet Balances by Type */}
      {walletTypes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Admin Wallet Balances (Withdrawable Fees)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {walletTypes.map((wType) => {
              const currencies = Object.entries(totalsByWalletType[wType])
                .filter(([, v]) => v.total > 0)
                .sort(([, a], [, b]) => b.total - a.total);
              if (currencies.length === 0) return null;
              return (
                <Card key={wType}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {wType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {currencies.length} currencies
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {currencies.map(([currency, data]) => (
                        <div
                          key={currency}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-medium">{currency}</span>
                          <div className="text-right">
                            <span className="font-mono">
                              {formatNumber(data.available)}
                            </span>
                            {data.available < data.total && (
                              <span className="text-xs text-muted-foreground ml-1">
                                / {formatNumber(data.total)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Fee Sources & Top Currencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top Fee Sources */}
        {topTypes.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Top Fee Sources
              </h3>
              <div className="space-y-2">
                {topTypes.map(([type, data]) => {
                  const maxTotal = topTypes[0][1].total;
                  const pct = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs">
                          {type.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono text-xs">
                          {formatNumber(data.total)} ({data.count})
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Currencies */}
        {topCurrencies.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Top Currencies
              </h3>
              <div className="space-y-2">
                {topCurrencies.map(([currency, data]) => {
                  const maxTotal = topCurrencies[0][1].total;
                  const pct = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
                  return (
                    <div key={currency} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-xs">{currency}</span>
                        <span className="font-mono text-xs">
                          {formatNumber(data.total)} ({data.count} txns)
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {summary.trackingSince && (
        <p className="text-xs text-muted-foreground text-center">
          Tracking since{" "}
          {new Date(summary.trackingSince).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

export default function AdminProfitPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();

  return (
    <div className="container pt-24 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profit Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and manage platform fees, revenue sources, and admin wallet
          balances across all transaction types.
        </p>
      </div>
      <ProfitSummaryDashboard />
      <DataTable
        apiEndpoint="/api/admin/finance/profit"
        model="adminProfit"
        permissions={{
          access: "access.profit",
          view: "view.profit",
          create: "create.profit",
          edit: "edit.profit",
          delete: "delete.profit"}}
        pageSize={12}
        canCreate={false}
        canEdit={false}
        canDelete
        canView
        isParanoid={false}
        itemTitle="Profit"
        columns={columns}
        analytics={analytics}
      />
    </div>
  );
}
