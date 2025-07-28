import { Search, Filter, ChevronDown } from "lucide-react";
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

export function SearchFilters() {
  const t = useTranslations("ext");
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by trade ID, cryptocurrency, or trader name..."
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <Filter className="h-4 w-4 mr-1" />
              {t("Filters")}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">{t("filter_trades")}</h4>
              <Separator />

              <div className="space-y-2">
                <h5 className="text-sm font-medium">{t("trade_type")}</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="buy" defaultChecked />
                    <Label htmlFor="buy">{t("buy_orders")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="sell" defaultChecked />
                    <Label htmlFor="sell">{t("sell_orders")}</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium">{t("Status")}</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="active" defaultChecked />
                    <Label htmlFor="active">{t("Active")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="completed" />
                    <Label htmlFor="completed">{t("Completed")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="disputed" />
                    <Label htmlFor="disputed">{t("Disputed")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="cancelled" />
                    <Label htmlFor="cancelled">{t("Cancelled")}</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium">{t("date_range")}</h5>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all_time")}</SelectItem>
                    <SelectItem value="today">{t("Today")}</SelectItem>
                    <SelectItem value="week">{t("this_week")}</SelectItem>
                    <SelectItem value="month">{t("this_month")}</SelectItem>
                    <SelectItem value="custom">{t("custom_range")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" size="sm">
                  {t("Reset")}
                </Button>
                <Button size="sm">{t("apply_filters")}</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Cryptocurrency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_cryptocurrencies")}</SelectItem>
            <SelectItem value="btc">{t("bitcoin_(btc)")}</SelectItem>
            <SelectItem value="eth">{t("ethereum_(eth)")}</SelectItem>
            <SelectItem value="usdt">{t("tether_(usdt)")}</SelectItem>
            <SelectItem value="sol">{t("solana_(sol)")}</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="newest">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("newest_first")}</SelectItem>
            <SelectItem value="oldest">{t("oldest_first")}</SelectItem>
            <SelectItem value="value_high">{t("highest_value")}</SelectItem>
            <SelectItem value="value_low">{t("lowest_value")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
