"use client";

import { useEffect, useState } from "react";
import {
  Users,
  ShoppingBag,
  Package,
  Tag,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Truck,
  BarChart3,
  Filter,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { $fetch } from "@/lib/api";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalUnitsSold: number;
  newCustomers: number;
  revenueChange?: number;
  ordersChange?: number;
  averageOrderChange?: number;
  unitsSoldChange?: number;
  newCustomersChange?: number;
  revenueChartData?: number[];
  orderValueChartData?: number[];
  unitsSoldChartData?: number[];
  customersChartData?: number[];
  revenueByStatus: Record<string, number>;
  revenueByDay: Record<string, number>;
  ordersByProductType: Record<string, number>;
  topProducts: any[];
  chartData: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
    }>;
  };
  recentOrders: any[];
  pendingOrders: number;
  outOfStockCount: number;
  rejectedOrders: number;
  completedOrders: number;
}
export default function DashboardClient() {
  const t = useTranslations("ext");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("week");
  const [activeChartType, setActiveChartType] = useState("revenue");
  const fetchDashboardData = async () => {
    try {
      setError(null);

      // Calculate date range based on timeRange
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === "week") {
        startDate.setDate(endDate.getDate() - 7);
      } else if (timeRange === "month") {
        startDate.setDate(endDate.getDate() - 30);
      } else if (timeRange === "year") {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }

      // Fetch all dashboard data from single endpoint
      const { data, error: fetchError } = await $fetch({
        url: `/api/admin/ecommerce/dashboard?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&chartType=${activeChartType}`,
        silentSuccess: true,
      });
      if (fetchError) {
        throw new Error(fetchError || "Failed to fetch dashboard data");
      }
      if (data) {
        setDashboardData(data);
      } else {
        throw new Error("No data received from API");
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      );
    }
  };
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchDashboardData();
      setIsLoading(false);
    };
    loadData();
  }, [timeRange, activeChartType]);
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-zinc-900/50 rounded-lg border border-gray-200 dark:border-zinc-800">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t("failed_to_load_dashboard")}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
            {error}
          </p>
        </div>
      </div>
    );
  }
  const stats = dashboardData;
  const chartData = dashboardData?.chartData;
  const topSellingProducts = dashboardData?.topProducts || [];
  const recentOrders = dashboardData?.recentOrders || [];
  return (
    <div className="space-y-6">
      {/* Header with refresh button and date range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900/50 p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {t("Dashboard")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            <span className="mx-2">•</span>
            <Clock className="h-4 w-4 mr-1" />
            {new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="block pl-3 pr-10 py-1.5 text-sm border-gray-300 dark:border-zinc-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
          >
            <option value="week">{t("last_7_days")}</option>
            <option value="month">{t("last_30_days")}</option>
            <option value="year">{t("last_12_months")}</option>
          </select>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`$${
            stats?.totalRevenue?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"
          }`}
          change={stats?.revenueChange || null}
          isPositive={stats?.revenueChange ? stats.revenueChange > 0 : null}
          icon={<DollarSign className="h-5 w-5 text-white" />}
          iconBg="from-green-500 to-green-600"
          description={`From ${stats?.totalOrders || 0} orders`}
          isLoading={isLoading}
          chartData={stats?.revenueChartData || null}
        />
        <MetricCard
          title="Average Order"
          value={`$${
            stats?.averageOrderValue?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"
          }`}
          change={stats?.averageOrderChange || null}
          isPositive={
            stats?.averageOrderChange ? stats.averageOrderChange > 0 : null
          }
          icon={<ShoppingBag className="h-5 w-5 text-white" />}
          iconBg="from-blue-500 to-blue-600"
          description="Per order"
          isLoading={isLoading}
          chartData={stats?.orderValueChartData || null}
        />
        <MetricCard
          title="Products Sold"
          value={stats?.totalUnitsSold?.toLocaleString() || "0"}
          change={stats?.unitsSoldChange || null}
          isPositive={stats?.unitsSoldChange ? stats.unitsSoldChange > 0 : null}
          icon={<Package className="h-5 w-5 text-white" />}
          iconBg="from-purple-500 to-purple-600"
          description="Total units"
          isLoading={isLoading}
          chartData={stats?.unitsSoldChartData || null}
        />
        <MetricCard
          title="New Customers"
          value={stats?.newCustomers?.toLocaleString() || "0"}
          change={stats?.newCustomersChange || null}
          isPositive={
            stats?.newCustomersChange ? stats.newCustomersChange > 0 : null
          }
          icon={<Users className="h-5 w-5 text-white" />}
          iconBg="from-amber-500 to-amber-600"
          description="First-time buyers"
          isLoading={isLoading}
          chartData={stats?.customersChartData || null}
        />
      </div>

      {/* Sales chart */}
      <div className="bg-white dark:bg-zinc-900/50 rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
              {t("sales_overview")}
            </h2>
            <div className="mt-3 sm:mt-0 flex flex-wrap items-center gap-2">
              <div className="flex p-1 bg-gray-100 dark:bg-zinc-700 rounded-md">
                <button
                  onClick={() => setActiveChartType("revenue")}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${activeChartType === "revenue" ? "bg-white dark:bg-zinc-600 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {t("Revenue")}
                </button>
                <button
                  onClick={() => setActiveChartType("orders")}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${activeChartType === "orders" ? "bg-white dark:bg-zinc-600 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {t("Orders")}
                </button>
                <button
                  onClick={() => setActiveChartType("customers")}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${activeChartType === "customers" ? "bg-white dark:bg-zinc-600 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {t("Customers")}
                </button>
              </div>
              <button className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            </div>
          ) : (
            <div className="h-64 relative">
              {chartData && chartData.labels && chartData.datasets ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full px-5 pt-5">
                    <div className="relative h-full">
                      {/* Render actual chart data */}
                      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between h-[90%]">
                        {chartData.labels.map((label, i) => {
                          // Calculate height as percentage of max value
                          const maxValue = Math.max(
                            ...chartData.datasets[0].data
                          );
                          const value = chartData.datasets[0].data[i];
                          const height =
                            maxValue > 0 ? (value / maxValue) * 100 : 0;
                          return (
                            <div key={i} className="w-1/12 px-1 group relative">
                              <div
                                className="bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-300 rounded-t-md group-hover:from-indigo-700 group-hover:to-indigo-500 dark:group-hover:from-indigo-600 dark:group-hover:to-indigo-400 transition-all duration-200"
                                style={{
                                  height: `${height}%`,
                                }}
                              ></div>
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                {activeChartType === "revenue" ? "$" : ""}
                                {value.toLocaleString()}
                                {activeChartType === "orders" ||
                                activeChartType === "customers"
                                  ? " units"
                                  : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* X-axis labels */}
                      <div className="absolute bottom-[-20px] left-0 right-0 flex justify-between">
                        {chartData.labels.map((label, i) => (
                          <div
                            key={i}
                            className="text-xs text-gray-500 dark:text-gray-400 truncate px-1 text-center"
                          >
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {t("no_chart_data_available")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats below chart */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
            <div className="flex items-center p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("total_sales")}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  / $
                  {stats?.totalRevenue?.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  }) || "0.00"}
                </p>
                {stats?.revenueChange !== null &&
                  stats?.revenueChange !== undefined &&
                  stats?.revenueChange !== 0 && (
                    <p
                      className={`text-xs flex items-center ${stats.revenueChange > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      {stats.revenueChange > 0 ? "+" : ""}
                      {stats.revenueChange.toFixed(1)} {t("%_from_last_period")}
                    </p>
                  )}
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("Orders")}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {stats?.totalOrders || 0}
                </p>
                {stats?.ordersChange !== null &&
                  stats?.ordersChange !== undefined &&
                  stats?.ordersChange !== 0 && (
                    <p
                      className={`text-xs flex items-center ${stats.ordersChange > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      {stats.ordersChange > 0 ? "+" : ""}
                      {stats.ordersChange.toFixed(1)} {t("%_from_last_period")}
                    </p>
                  )}
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("Customers")}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {stats?.newCustomers || 0}
                </p>
                {stats?.newCustomersChange !== null &&
                  stats?.newCustomersChange !== undefined &&
                  stats?.newCustomersChange !== 0 && (
                    <p
                      className={`text-xs flex items-center ${stats.newCustomersChange > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      {stats.newCustomersChange > 0 ? "+" : ""}
                      {stats.newCustomersChange.toFixed(1)}{" "}
                      {t("%_from_last_period")}
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/50 rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-zinc-700 flex justify-between items-center">
            <h2 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
              <ShoppingBag className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              {t("recent_orders")}
            </h2>
            <Link
              href="/admin/ecommerce/orders"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
            >
              {t("view_all")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
              </div>
            ) : recentOrders && recentOrders.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-zinc-700">
                {recentOrders.map((order) => {
                  return (
                    <div
                      key={order.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full ${getStatusColor(order.status)} mr-3`}
                          ></div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              #
                              {order.id.slice(0, 8)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(
                                order.createdAt || Date.now()
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">
                            / $
                            {(order.total || 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {order.customer?.name || "Guest"}
                          </div>
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeColor(order.status)}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <Link
                          href={`/admin/ecommerce/orders/${order.id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-700 mb-4">
                  <ShoppingBag className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  {t("no_orders_found")}
                </p>
                <Link
                  href="/admin/ecommerce/orders"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  {t("view_all_orders")}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Status cards and top selling products */}
        <div className="space-y-6">
          {/* Status cards */}
          <div className="grid grid-cols-2 gap-4">
            <StatusCard
              title="Pending Orders"
              value={stats?.pendingOrders || 0}
              icon={
                <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              }
              bgColor="bg-amber-50 dark:bg-amber-900/10"
              textColor="text-amber-700 dark:text-amber-400"
              borderColor="border-amber-200 dark:border-amber-800"
              href="/admin/ecommerce/order?status=PENDING"
            />
            <StatusCard
              title="Out of Stock"
              value={stats?.outOfStockCount || 0}
              icon={
                <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
              }
              bgColor="bg-red-50 dark:bg-red-900/10"
              textColor="text-red-700 dark:text-red-400"
              borderColor="border-red-200 dark:border-red-800"
              href="/admin/ecommerce/product?stock=out"
            />
            <StatusCard
              title="Rejected Orders"
              value={stats?.rejectedOrders || 0}
              icon={
                <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
              }
              bgColor="bg-red-50 dark:bg-red-900/10"
              textColor="text-red-700 dark:text-red-400"
              borderColor="border-red-200 dark:border-red-800"
              href="/admin/ecommerce/order?status=REJECTED"
            />
            <StatusCard
              title="Completed Orders"
              value={stats?.completedOrders || 0}
              icon={
                <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
              }
              bgColor="bg-green-50 dark:bg-green-900/10"
              textColor="text-green-700 dark:text-green-400"
              borderColor="border-green-200 dark:border-green-800"
              href="/admin/ecommerce/order?status=COMPLETED"
            />
          </div>

          {/* Top selling products */}
          <div className="bg-white dark:bg-zinc-900/50 rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-700 flex justify-between items-center">
              <h2 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
                <Package className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                {t("top_selling_products")}
              </h2>
              <Link
                href="/admin/ecommerce/product"
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
              >
                {t("view_all")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-zinc-700">
              {isLoading ? (
                Array.from({
                  length: 3,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="p-3 animate-pulse flex items-center"
                  >
                    <div className="h-10 w-10 bg-gray-200 dark:bg-zinc-600 rounded"></div>
                    <div className="ml-3 flex-1">
                      <div className="h-3 bg-gray-200 dark:bg-zinc-600 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-gray-200 dark:bg-zinc-600 rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-zinc-600 rounded w-12"></div>
                  </div>
                ))
              ) : topSellingProducts.length > 0 ? (
                topSellingProducts.slice(0, 3).map((product) => {
                  return (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors duration-150"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative rounded overflow-hidden bg-gray-100 dark:bg-zinc-700">
                          <Image
                            src={
                              product.image ||
                              "/placeholder.svg?height=40&width=40"
                            }
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {product.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {product.category?.name || "Uncategorized"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            / $
                            {product.price?.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {product.soldCount || 0} {t("sold")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-700 mb-4">
                    <Package className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    {t("no_products_found")}
                  </p>
                  <Link
                    href="/admin/ecommerce/product"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    {t("view_all_products")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Add New Product"
          description="Create and publish a new product to your store"
          icon={<Package className="h-5 w-5 text-white" />}
          iconBg="from-indigo-600 to-indigo-700"
          href="/admin/ecommerce/product"
        />
        <QuickActionCard
          title="Manage Categories"
          description="Organize your products with categories"
          icon={<Tag className="h-5 w-5 text-white" />}
          iconBg="from-purple-600 to-purple-700"
          href="/admin/ecommerce/category"
        />
        <QuickActionCard
          title="View Orders"
          description="See all customer orders and their statuses"
          icon={<ShoppingBag className="h-5 w-5 text-white" />}
          iconBg="from-green-600 to-green-700"
          href="/admin/ecommerce/order"
        />
      </div>
    </div>
  );
}
function MetricCard({
  title,
  value,
  change,
  isPositive,
  icon,
  iconBg,
  description,
  isLoading,
  chartData,
}) {
  // Don't show change indicators if change is 0 or null/undefined
  const shouldShowChange =
    change !== null && change !== undefined && change !== 0;
  return (
    <div className="bg-white dark:bg-zinc-900/50 overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800">
      <div className="p-4">
        <div className="flex items-center">
          <div
            className={`flex-shrink-0 rounded-md p-2 bg-gradient-to-r ${iconBg}`}
          >
            {icon}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              {title}
            </p>
            <div className="flex items-baseline">
              {isLoading ? (
                <div className="animate-pulse h-6 bg-gray-200 dark:bg-zinc-600 rounded w-20 mt-1"></div>
              ) : (
                <>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {value}
                  </p>
                  {shouldShowChange && (
                    <p
                      className={`ml-2 flex items-baseline text-xs font-semibold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {isPositive ? (
                        <ChevronUp
                          className="self-center flex-shrink-0 h-3 w-3 text-green-500 dark:text-green-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronDown
                          className="self-center flex-shrink-0 h-3 w-3 text-red-500 dark:text-red-400"
                          aria-hidden="true"
                        />
                      )}
                      <span className="sr-only">
                        {isPositive ? "Increased" : "Decreased"} by
                      </span>
                      {Math.abs(change).toFixed(1)}%
                    </p>
                  )}
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>

        {/* Mini chart */}
        <div className="mt-3 h-10">
          {chartData && chartData.length > 0 && (
            <div className="flex items-end h-full space-x-1">
              {chartData.map((value, i) => {
                const maxValue = Math.max(...chartData);
                const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-indigo-100 dark:bg-indigo-900/20 rounded-sm hover:bg-indigo-200 dark:hover:bg-indigo-900/30 transition-colors"
                    style={{
                      height: `${height}%`,
                    }}
                  ></div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function StatusCard({
  title,
  value,
  icon,
  bgColor,
  textColor,
  borderColor,
  href,
}) {
  return (
    <Link
      href={href}
      className={`block p-4 rounded-lg border ${borderColor} ${bgColor} hover:shadow-md transition-shadow duration-200`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium ${textColor}`}>{title}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className="p-2 rounded-full bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800">
          {icon}
        </div>
      </div>
    </Link>
  );
}
function QuickActionCard({ title, description, icon, iconBg, href }) {
  return (
    <Link
      href={href}
      className="bg-white dark:bg-zinc-900/50 overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800 hover:shadow-md transition-shadow duration-200"
    >
      <div className="p-4">
        <div className="flex items-center">
          <div
            className={`flex-shrink-0 rounded-md p-2 bg-gradient-to-r ${iconBg}`}
          >
            {icon}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
          <div className="ml-2 flex-shrink-0">
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    </Link>
  );
}
function getStatusBadgeColor(status) {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
    case "COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "CANCELLED":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
}
function getStatusColor(status) {
  switch (status) {
    case "PENDING":
      return "bg-amber-500";
    case "COMPLETED":
      return "bg-green-500";
    case "CANCELLED":
      return "bg-red-500";
    case "REJECTED":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}
