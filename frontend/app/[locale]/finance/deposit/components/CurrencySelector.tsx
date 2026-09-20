"use client";

import { useState, useMemo } from "react";
import { m } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { fadeInUp } from "./deposit-helpers";
import {
  GlassPanel,
  SectionTitle,
  CurrencyMark,
} from "../../_components/finance-ui";
import { cn } from "@/lib/utils";

interface CurrencySelectorProps {
  currencies: any[];
  selectedCurrency: string;
  onSelect: (currency: string) => void;
}

export function CurrencySelector({
  currencies,
  selectedCurrency,
  onSelect,
}: CurrencySelectorProps) {
  const t = useTranslations("common");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 12;

  const filtered = useMemo(
    () =>
      currencies.filter((c: any) => {
        const term = search.toLowerCase();
        return (
          c.value.toLowerCase().includes(term) ||
          (c.label || "").toLowerCase().includes(term)
        );
      }),
    [currencies, search]
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const startIdx = (page - 1) * perPage;
  const paginated = filtered.slice(startIdx, startIdx + perPage);

  return (
    <m.div {...fadeInUp} data-tour="deposit-currency">
      <GlassPanel>
        <SectionTitle
          step={2}
          title={t("select_currency")}
          hint={t("supported", { length: currencies.length })}
          trailing={
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`${t("search_currencies")}…`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-sm"
              />
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {paginated.map((currency: any) => {
            const selected = selectedCurrency === currency.value;
            return (
              <m.button
                key={currency.value}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(currency.value)}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border/70 bg-card/60 hover:border-border-strong"
                )}
              >
                <CurrencyMark code={currency.value} icon={currency.icon} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">
                    {currency.value}
                  </div>
                  <div className="truncate text-xs text-subtle-foreground">
                    {(currency.label || "").split("-")[1]?.trim() || currency.label || currency.value}
                  </div>
                </div>
                {selected && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                )}
              </m.button>
            );
          })}
        </div>

        {paginated.length === 0 && search && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-subtle-foreground dark:bg-surface-2/40">
            {t("no_currencies_found")} "{search}"
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
            <div className="text-xs text-subtle-foreground">
              {t("showing")} {startIdx + 1}–{Math.min(startIdx + perPage, filtered.length)} {t("of")} {filtered.length}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs font-semibold text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </GlassPanel>
    </m.div>
  );
}
