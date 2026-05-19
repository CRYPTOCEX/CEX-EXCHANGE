"use client";

import { useState, useEffect, useRef } from "react";
import { CustomComponentProps } from "@/components/admin/settings";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  ChevronDown,
  Info,
  Wallet,
  Coins,
} from "lucide-react";
import $fetch from "@/lib/api";
import { useTranslations } from "next-intl";

interface WalletTypeConfig {
  value: string;
  label: string;
  enabled: boolean;
  currencies: Array<{ value: string; label: string; icon?: string }>;
}

interface CurrencyOptions {
  walletTypes: WalletTypeConfig[];
  systemSettings: {
    kycEnabled: boolean;
  };
}

interface AllowedWalletTypes {
  [walletType: string]: {
    enabled: boolean;
    currencies: string[];
  };
}

export default function WalletTypesField({
  formValues,
  handleChange,
}: CustomComponentProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  const [loading, setLoading] = useState(true);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOptions | null>(null);
  const [currencySearch, setCurrencySearch] = useState<Record<string, string>>({});

  // Use a ref to track the latest formValues to avoid stale closures in async functions
  const formValuesRef = useRef(formValues);
  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  // Parse the allowed wallet types from form values
  const getAllowedWalletTypes = (): AllowedWalletTypes => {
    const value = formValues.gatewayAllowedWalletTypes;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    if (typeof value === "object" && value !== null) {
      return value;
    }
    return {};
  };

  const allowedWalletTypes = getAllowedWalletTypes();

  useEffect(() => {
    fetchCurrencyOptions();
  }, []);

  const fetchCurrencyOptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await $fetch({
        url: "/api/admin/gateway/currencies",
        silent: true,
      });

      if (!error && data) {
        setCurrencyOptions(data);

        // Use ref to get the latest formValues to avoid stale closure
        const currentValue = formValuesRef.current.gatewayAllowedWalletTypes;
        let currentAllowed: AllowedWalletTypes = {};

        if (typeof currentValue === "string" && currentValue.trim()) {
          try {
            currentAllowed = JSON.parse(currentValue);
          } catch {
            currentAllowed = {};
          }
        } else if (typeof currentValue === "object" && currentValue !== null) {
          currentAllowed = currentValue;
        }

        // Initialize allowed wallet types only if truly empty
        if (Object.keys(currentAllowed).length === 0) {
          const defaultAllowed: AllowedWalletTypes = {};
          data.walletTypes.forEach((wt: WalletTypeConfig) => {
            defaultAllowed[wt.value] = {
              enabled: wt.value === "FIAT",
              currencies: wt.value === "FIAT" ? wt.currencies.slice(0, 3).map((c) => c.value) : [],
            };
          });
          handleChange("gatewayAllowedWalletTypes", defaultAllowed);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleWalletType = (walletType: string, enabled: boolean) => {
    const newAllowed = {
      ...allowedWalletTypes,
      [walletType]: {
        ...allowedWalletTypes[walletType],
        enabled,
        currencies: enabled
          ? allowedWalletTypes[walletType]?.currencies || []
          : [],
      },
    };
    handleChange("gatewayAllowedWalletTypes", newAllowed);
  };

  const toggleCurrency = (walletType: string, currency: string, enabled: boolean) => {
    const currentCurrencies = allowedWalletTypes[walletType]?.currencies || [];
    const newCurrencies = enabled
      ? [...currentCurrencies, currency]
      : currentCurrencies.filter((c) => c !== currency);

    const newAllowed = {
      ...allowedWalletTypes,
      [walletType]: {
        ...allowedWalletTypes[walletType],
        currencies: newCurrencies,
      },
    };
    handleChange("gatewayAllowedWalletTypes", newAllowed);
  };

  const selectAllCurrencies = (walletType: string) => {
    const wt = currencyOptions?.walletTypes.find((w) => w.value === walletType);
    if (!wt) return;

    const newAllowed = {
      ...allowedWalletTypes,
      [walletType]: {
        ...allowedWalletTypes[walletType],
        currencies: wt.currencies.map((c) => c.value),
      },
    };
    handleChange("gatewayAllowedWalletTypes", newAllowed);
  };

  const deselectAllCurrencies = (walletType: string) => {
    const newAllowed = {
      ...allowedWalletTypes,
      [walletType]: {
        ...allowedWalletTypes[walletType],
        currencies: [],
      },
    };
    handleChange("gatewayAllowedWalletTypes", newAllowed);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t("merchants_will_receive_the_specified_currency")} {t("fees_are_calculated_in_usd_and")}
        </AlertDescription>
      </Alert>

      {currencyOptions?.walletTypes && currencyOptions.walletTypes.length > 0 ? (
        <Accordion type="multiple" className="space-y-3">
          {currencyOptions.walletTypes.map((wt) => {
            const wtConfig = allowedWalletTypes[wt.value] || {
              enabled: false,
              currencies: [],
            };
            const selectedCount = wtConfig.currencies?.length || 0;

            return (
              <AccordionItem
                key={wt.value}
                value={wt.value}
                className="border rounded-lg group last:border-b"
              >
                <div className="flex items-center gap-4 px-4 py-4">
                  <Switch
                    checked={wtConfig.enabled}
                    onCheckedChange={(checked) => toggleWalletType(wt.value, checked)}
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Coins className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{wt.label} Wallet</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{wt.currencies.length} {t("currencies_available")}</span>
                        {selectedCount > 0 && (
                          <Badge variant="secondary">
                            {selectedCount} selected
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <AccordionTrigger className="hover:no-underline p-0 shrink-0 [&>svg]:hidden">
                    <div className="h-9 w-9 flex items-center justify-center rounded-md border hover:bg-muted transition-colors cursor-pointer">
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </AccordionTrigger>
                </div>
                <AccordionContent className="px-4">
                  {wtConfig.enabled ? (
                    <div className="pb-4 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={`Search ${wt.label.toLowerCase()} currencies...`}
                            className="pl-9"
                            value={currencySearch[wt.value] || ""}
                            onChange={(e) =>
                              setCurrencySearch((prev) => ({
                                ...prev,
                                [wt.value]: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => selectAllCurrencies(wt.value)}
                          >
                            {tCommon("select_all")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deselectAllCurrencies(wt.value)}
                          >
                            {tCommon("deselect_all")}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {wt.currencies
                          .filter((currency) => {
                            const search = (currencySearch[wt.value] || "").toLowerCase();
                            if (!search) return true;
                            return (
                              currency.value.toLowerCase().includes(search) ||
                              currency.label.toLowerCase().includes(search)
                            );
                          })
                          .map((currency) => (
                            <div
                              key={currency.value}
                              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                wtConfig.currencies?.includes(currency.value)
                                  ? "border-primary bg-primary/5"
                                  : "hover:border-muted-foreground/50"
                              }`}
                              onClick={() =>
                                toggleCurrency(
                                  wt.value,
                                  currency.value,
                                  !wtConfig.currencies?.includes(currency.value)
                                )
                              }
                            >
                              <Checkbox
                                checked={wtConfig.currencies?.includes(currency.value)}
                                onCheckedChange={(checked) =>
                                  toggleCurrency(wt.value, currency.value, !!checked)
                                }
                              />
                              <span className="text-sm font-medium">{currency.value}</span>
                            </div>
                          ))}
                      </div>
                      {wt.currencies.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {tExt("no_currencies_available_for_this_wallet_type")}
                        </p>
                      )}
                      {wt.currencies.length > 0 &&
                        currencySearch[wt.value] &&
                        wt.currencies.filter((c) => {
                          const search = currencySearch[wt.value].toLowerCase();
                          return (
                            c.value.toLowerCase().includes(search) ||
                            c.label.toLowerCase().includes(search)
                          );
                        }).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {t("no_currencies_match")} "{currencySearch[wt.value]}"
                          </p>
                        )}
                    </div>
                  ) : (
                    <p className="pb-4 text-sm text-muted-foreground">
                      {t("enable_this_wallet_type_to_select_currencies")}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("no_wallet_types_available")}</p>
          <p className="text-sm">
            {t("enable_wallet_types_in_system_settings_first")}
          </p>
        </div>
      )}
    </div>
  );
}
