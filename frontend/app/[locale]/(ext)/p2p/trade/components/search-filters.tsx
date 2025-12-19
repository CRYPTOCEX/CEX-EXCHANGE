"use client";

import { Search, Filter, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export interface TradeFilters {
  search: string;
  currency: string;
  sortBy: string;
  tradeTypes: {
    buy: boolean;
    sell: boolean;
  };
  statuses: {
    active: boolean;
    completed: boolean;
    disputed: boolean;
    cancelled: boolean;
  };
  dateRange: string;
}

interface SearchFiltersProps {
  filters: TradeFilters;
  onFiltersChange: (filters: TradeFilters) => void;
  availableCurrencies?: string[];
}

export function SearchFilters({
  filters,
  onFiltersChange,
  availableCurrencies = [],
}: SearchFiltersProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleCurrencyChange = (value: string) => {
    onFiltersChange({ ...filters, currency: value });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({ ...filters, sortBy: value });
  };

  const handleTradeTypeChange = (type: "buy" | "sell", checked: boolean) => {
    onFiltersChange({
      ...filters,
      tradeTypes: { ...filters.tradeTypes, [type]: checked },
    });
  };

  const handleStatusChange = (
    status: "active" | "completed" | "disputed" | "cancelled",
    checked: boolean
  ) => {
    onFiltersChange({
      ...filters,
      statuses: { ...filters.statuses, [status]: checked },
    });
  };

  const handleDateRangeChange = (value: string) => {
    onFiltersChange({ ...filters, dateRange: value });
  };

  const handleReset = () => {
    onFiltersChange({
      search: "",
      currency: "all",
      sortBy: "newest",
      tradeTypes: { buy: true, sell: true },
      statuses: { active: true, completed: false, disputed: false, cancelled: false },
      dateRange: "all",
    });
  };

  // Count active filters
  const activeFilterCount = [
    filters.currency !== "all",
    filters.dateRange !== "all",
    !filters.tradeTypes.buy || !filters.tradeTypes.sell,
    filters.statuses.completed || filters.statuses.disputed || filters.statuses.cancelled,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("search_by_trade_id_cryptocurrency_or_counterparty")}
          className="pl-9"
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {filters.search && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <Filter className="h-4 w-4 mr-1" />
              {tCommon("filters")}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">{t("filter_trades")}</h4>
              <Separator />

              <div className="space-y-2">
                <h5 className="text-sm font-medium">{tCommon("trade_type")}</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="buy"
                      checked={filters.tradeTypes.buy}
                      onCheckedChange={(checked) =>
                        handleTradeTypeChange("buy", checked as boolean)
                      }
                    />
                    <Label htmlFor="buy">{tCommon("buy_orders")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sell"
                      checked={filters.tradeTypes.sell}
                      onCheckedChange={(checked) =>
                        handleTradeTypeChange("sell", checked as boolean)
                      }
                    />
                    <Label htmlFor="sell">{tCommon("sell_orders")}</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium">{tCommon("status")}</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="active"
                      checked={filters.statuses.active}
                      onCheckedChange={(checked) =>
                        handleStatusChange("active", checked as boolean)
                      }
                    />
                    <Label htmlFor="active">{tCommon("active")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="completed"
                      checked={filters.statuses.completed}
                      onCheckedChange={(checked) =>
                        handleStatusChange("completed", checked as boolean)
                      }
                    />
                    <Label htmlFor="completed">{tCommon("completed")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="disputed"
                      checked={filters.statuses.disputed}
                      onCheckedChange={(checked) =>
                        handleStatusChange("disputed", checked as boolean)
                      }
                    />
                    <Label htmlFor="disputed">{tExt("disputed")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cancelled"
                      checked={filters.statuses.cancelled}
                      onCheckedChange={(checked) =>
                        handleStatusChange("cancelled", checked as boolean)
                      }
                    />
                    <Label htmlFor="cancelled">{tCommon("cancelled")}</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium">{tExt("date_range")}</h5>
                <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_date_range")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tCommon("all_time")}</SelectItem>
                    <SelectItem value="today">{t("today")}</SelectItem>
                    <SelectItem value="week">{t("this_week")}</SelectItem>
                    <SelectItem value="month">{tCommon("this_month")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  {tExt("reset")}
                </Button>
                <Button size="sm" onClick={() => {}}>
                  {tExt("apply_filters")}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={filters.currency} onValueChange={handleCurrencyChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Cryptocurrency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_cryptocurrencies")}</SelectItem>
            {availableCurrencies.length > 0 ? (
              availableCurrencies.map((currency) => (
                <SelectItem key={currency} value={currency.toLowerCase()}>
                  {currency}
                </SelectItem>
              ))
            ) : (
              <>
                <SelectItem value="btc">BTC</SelectItem>
                <SelectItem value="eth">ETH</SelectItem>
                <SelectItem value="usdt">USDT</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        <Select value={filters.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={tCommon("sort_by")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{tCommon("newest_first")}</SelectItem>
            <SelectItem value="oldest">{tCommon("oldest_first")}</SelectItem>
            <SelectItem value="value_high">{t("highest_value")}</SelectItem>
            <SelectItem value="value_low">{t("lowest_value")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
