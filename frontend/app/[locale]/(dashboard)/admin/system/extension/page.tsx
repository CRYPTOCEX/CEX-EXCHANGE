"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useProductsStore, type Product } from "@/store/products";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Boxes,
  Cpu,
  Globe,
  Package,
  Download,
  ExternalLink,
  ShieldCheck,
  ShieldX,
  Sparkles,
  LayoutGrid,
  List,
  ChevronLeft,
} from "lucide-react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductsPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const {
    filteredProducts,
    extensions,
    blockchains,
    exchangeProviders,
    isLoading,
    error,
    toggleError,
    filter,
    categoryFilter,
    fetchProducts,
    setFilter,
    setCategoryFilter,
    toggleProductStatus,
    refreshProducts,
    clearToggleError,
  } = useProductsStore();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Show toast when toggle error occurs
  useEffect(() => {
    if (toggleError) {
      toast({
        title: "Error",
        description: toggleError,
        variant: "destructive",
      });
      clearToggleError();
    }
  }, [toggleError, toast, clearToggleError]);

  // Initialize category from URL query param
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam && ["all", "extension", "blockchain", "exchange"].includes(typeParam)) {
      setCategoryFilter(typeParam as any);
    }
  }, [searchParams, setCategoryFilter]);

  // Update URL when category changes
  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value as any);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
  }, [searchParams, setCategoryFilter, router, pathname]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const all = [...extensions, ...blockchains, ...exchangeProviders];
    return {
      total: all.length,
      extensions: extensions.length,
      blockchains: blockchains.length,
      exchanges: exchangeProviders.length,
      licensed: all.filter((p) => p.licenseVerified).length,
      unlicensed: all.filter((p) => !p.licenseVerified).length,
      active: all.filter((p) => p.status).length,
      withUpdates: all.filter((p) => p.hasLicenseUpdate).length,
    };
  }, [extensions, blockchains, exchangeProviders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProducts();
    setIsRefreshing(false);
  };

  const handleProductClick = (product: Product) => {
    // For exchanges: if licensed and active, go to finance exchange page
    // Otherwise go to the extension page for activation/management
    if (product.category === "exchange") {
      if (product.licenseVerified && product.status) {
        // Active exchange - go to exchange management page
        router.push("/admin/finance/exchange");
        return;
      }
      // Not active or not licensed - go to activation page
      router.push(`/admin/system/extension/${product.productId}`);
      return;
    }

    // For extensions and blockchains - go to the product page
    // It will show showcase for unlicensed or management for licensed
    router.push(`/admin/system/extension/${product.productId}`);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "extension":
        return <Boxes className="h-4 w-4" />;
      case "blockchain":
        return <Cpu className="h-4 w-4" />;
      case "exchange":
        return <Globe className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "extension":
        return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
      case "blockchain":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "exchange":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  // Get product image - use local images for exchanges
  const getProductImage = (product: Product): string | null => {
    // For exchanges, use local images from /img/exchanges/
    if (product.category === "exchange") {
      const baseName = product.name?.toLowerCase();
      if (!baseName) return null;

      // Some exchanges have SVG versions
      const svgExchanges = ["binance", "binanceus", "kucoin", "kraken", "okx"];
      if (svgExchanges.includes(baseName)) {
        return `/img/exchanges/${baseName}.svg`;
      }
      // Most have JPG versions
      return `/img/exchanges/${baseName}.png`;
    }

    // For other products, use the image from the product data
    return product.image || null;
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">{t("error_loading_products")}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchProducts()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-background border-b">
        <div className="container py-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                  className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold tracking-tight"
                >
                  {t("add_ons_integrations")}
                </motion.h1>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground max-w-xl"
              >
                {t("expand_your_platform_with_extensions_blockchain")}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3"
            >
              <Button
                variant="outline"
                size="default"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2 h-9"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => router.push("/admin")}
                className="gap-1 h-9"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <Card className="bg-background/60 backdrop-blur-sm border-primary/10 h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{tCommon("total_products")}</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <Card className="bg-background/60 backdrop-blur-sm border-emerald-500/10 h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Licensed</p>
                      <p className="text-2xl font-bold text-emerald-600">{stats.licensed}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <Card className="bg-background/60 backdrop-blur-sm border-amber-500/10 h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Unlicensed</p>
                      <p className="text-2xl font-bold text-amber-600">{stats.unlicensed}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <ShieldX className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <Card className="bg-background/60 backdrop-blur-sm border-orange-500/10 h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("updates_available")}</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.withUpdates}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Download className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Filters & Content */}
      <div className="flex-1 container py-6 space-y-6">
        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.4 }}
          className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between"
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Tabs */}
            <Tabs
              value={categoryFilter}
              onValueChange={handleCategoryChange}
              className="w-auto"
            >
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  All ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="extension" className="text-xs gap-1.5">
                  <Boxes className="h-3.5 w-3.5" />
                  Extensions ({stats.extensions})
                </TabsTrigger>
                <TabsTrigger value="blockchain" className="text-xs gap-1.5">
                  <Cpu className="h-3.5 w-3.5" />
                  Blockchains ({stats.blockchains})
                </TabsTrigger>
                <TabsTrigger value="exchange" className="text-xs gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Exchanges ({stats.exchanges})
                </TabsTrigger>
              </TabsList>
            </Tabs>

          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 lg:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tCommon("search_products")}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center rounded-lg border p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Products Grid/List */}
        {isLoading ? (
          <div className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-3"
          )}>
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">{tCommon("no_products_found")}</h3>
              <p className="text-muted-foreground">
                {filter
                  ? "Try adjusting your search or filters"
                  : "No products available in this category"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-3"
              )}
            >
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <ProductCard
                    product={product}
                    viewMode={viewMode}
                    onToggle={() => toggleProductStatus(product)}
                    onClick={() => handleProductClick(product)}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryColor={getCategoryColor}
                    getProductImage={getProductImage}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
  onToggle: () => void;
  onClick: () => void;
  getCategoryIcon: (category: string) => React.ReactNode;
  getCategoryColor: (category: string) => string;
  getProductImage: (product: Product) => string | null;
}

function ProductCard({
  product,
  viewMode,
  onToggle,
  onClick,
  getCategoryIcon,
  getCategoryColor,
  getProductImage,
}: ProductCardProps) {
  const tCommon = useTranslations("common");
  const productImage = getProductImage(product);

  if (viewMode === "list") {
    return (
      <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Card
          className={cn(
            "group transition-all duration-200 hover:shadow-md cursor-pointer",
            !product.licenseVerified && "border-amber-500/30 bg-amber-500/5"
          )}
        >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Image */}
            <div
              className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden"
              onClick={onClick}
            >
              {productImage ? (
                <img
                  src={productImage}
                  alt={product.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                getCategoryIcon(product.category)
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0" onClick={onClick}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{product.title}</h3>
                <Badge variant="outline" className={cn("text-xs shrink-0", getCategoryColor(product.category))}>
                  {getCategoryIcon(product.category)}
                  <span className="ml-1 capitalize">{product.category}</span>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {product.description || "No description available"}
              </p>
            </div>

            {/* Version & Updates */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-sm font-medium">v{product.version}</p>
                {product.hasLicenseUpdate && (
                  <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                    <Download className="h-3 w-3 mr-1" />
                    Update
                  </Badge>
                )}
              </div>

              {/* License Status */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    {product.licenseVerified ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600">
                        <XCircle className="h-5 w-5" />
                      </div>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {product.licenseVerified ? "License verified" : "License required"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Status Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={product.status}
                        onCheckedChange={onToggle}
                        disabled={!product.licenseVerified}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!product.licenseVerified
                      ? "Activate license first"
                      : product.status
                      ? "Enabled"
                      : "Disabled"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* External Link */}
              {product.link && (
                <a
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="h-full"
    >
      <Card
        className={cn(
          "group transition-all duration-200 hover:shadow-xl cursor-pointer overflow-hidden h-full",
          !product.licenseVerified && "border-amber-500/30 bg-amber-500/5"
        )}
      >
        {/* Image Header */}
        <div
          className="relative h-42 bg-gradient-to-br from-muted to-muted/50 overflow-hidden"
          onClick={onClick}
        >
        {productImage ? (
          <>
            <img
              src={productImage}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = "flex";
              }}
            />
            <div className="h-full w-full items-center justify-center" style={{ display: "none" }}>
              <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center", getCategoryColor(product.category))}>
                {getCategoryIcon(product.category)}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center", getCategoryColor(product.category))}>
              {getCategoryIcon(product.category)}
            </div>
          </div>
        )}

        {/* Update Badge */}
        {product.hasLicenseUpdate && (
          <Badge className="absolute top-3 right-3 bg-orange-500 text-white text-xs">
            <Download className="h-3 w-3 mr-1" />
            Update
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title & Description */}
        <div onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {product.title}
            </h3>
            <Badge variant="outline" className={cn("text-xs shrink-0", getCategoryColor(product.category))}>
              {getCategoryIcon(product.category)}
              <span className="ml-1 capitalize">{product.category}</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {product.description || "No description available"}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {/* License Status */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  {product.licenseVerified ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {tCommon("verified")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                      <XCircle className="h-3 w-3" />
                      Activate
                    </Badge>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {product.licenseVerified
                    ? "License is verified and active"
                    : "Click to activate license"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="text-xs text-muted-foreground">v{product.version}</span>
          </div>

          {/* Toggle */}
          <div onClick={(e) => e.stopPropagation()}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch
                      checked={product.status}
                      onCheckedChange={onToggle}
                      disabled={!product.licenseVerified}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {!product.licenseVerified
                    ? "Activate license first"
                    : product.status
                    ? "Enabled"
                    : "Disabled"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
      </Card>
    </motion.div>
  );
}
