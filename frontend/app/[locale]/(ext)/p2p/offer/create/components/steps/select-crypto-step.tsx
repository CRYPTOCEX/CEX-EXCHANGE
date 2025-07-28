"use client";

import { useEffect, useState, useCallback } from "react";
import { useWizard } from "../trading-wizard";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { isValidCurrencyCode } from "@/utils/currency";

interface CurrencyOption {
  value: string;
  label: string;
}

interface CurrenciesResponse {
  FIAT: CurrencyOption[];
  SPOT: CurrencyOption[];
  FUNDING: CurrencyOption[];
  [key: string]: CurrencyOption[];
}

interface PriceResponse {
  status: boolean;
  message: string;
  data: number; // Price in USD
}

// Track failed images to prevent infinite refetching
const failedImages = new Set<string>();

export function SelectCryptoStep() {
  const t = useTranslations("ext");
  const { tradeData, updateTradeData, markStepComplete } = useWizard();
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [filteredCurrencies, setFilteredCurrencies] = useState<
    CurrencyOption[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Show 6 items per page (3 rows of 2 in desktop view)

  // Fetch currencies from API
  useEffect(() => {
    const fetchCurrencies = async () => {
      if (!tradeData.walletType) return;

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/finance/currency/valid");

        if (!response.ok) {
          throw new Error("Failed to fetch currencies");
        }

        const data: CurrenciesResponse = await response.json();

        // Get currencies for the selected wallet type
        // If wallet type is ECO, use FUNDING currencies
        const walletType =
          tradeData.walletType === "ECO" ? "FUNDING" : tradeData.walletType;
        const walletCurrencies = data[walletType] || [];

        setCurrencies(walletCurrencies);
        setFilteredCurrencies(walletCurrencies);
        setCurrentPage(1); // Reset to first page when wallet type changes

        // Set default selection if we have options and no selection yet
        if (walletCurrencies.length > 0 && !tradeData.currency) {
          // Use the first currency as default
          const defaultCurrency = walletCurrencies[0];
          updateTradeData({ currency: defaultCurrency.value });
          // Use the correct step number (3 for select-crypto-step)
          markStepComplete(3);
        }
      } catch (err) {
        console.error("Error fetching currencies:", err);
        setError("Failed to load currencies. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrencies();
  }, [tradeData.walletType]); // Remove dependencies that cause unnecessary rerenders

  // Filter currencies based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCurrencies(currencies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = currencies.filter(
        (currency) =>
          currency.value.toLowerCase().includes(query) ||
          currency.label.toLowerCase().includes(query)
      );
      setFilteredCurrencies(filtered);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery, currencies]);

  // Memoize the currency selection handler to prevent rerenders
  const handleCurrencySelect = useCallback(
    async (value: string) => {
      // Find the selected currency to get its label
      const selectedCurrency = currencies.find(
        (currency) => currency.value === value
      );

      // Fetch user's balance for this currency and wallet type
      let availableBalance = 0;
      try {
        const walletType = tradeData.walletType === "ECO" ? "FUNDING" : tradeData.walletType;
        const response = await fetch(`/api/finance/wallet/${walletType}/${value}`);
        
        if (response.ok) {
          const walletData = await response.json();
          if (walletData && walletData.balance !== undefined) {
            availableBalance = walletData.balance - (walletData.inOrder || 0);
          }
        }
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
        // Continue with 0 balance if fetch fails
      }

      // Update with currency value and balance
      updateTradeData({
        currency: value,
        availableBalance: availableBalance,
      });

      // Use the correct step number (3 for select-crypto-step)
      markStepComplete(3);
    },
    [updateTradeData, markStepComplete, currencies, tradeData.walletType]
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredCurrencies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredCurrencies.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Function to handle image errors without causing infinite refetching
  const handleImageError = (currency: string) => {
    // Add to failed images set to prevent future attempts
    failedImages.add(currency.toLowerCase());
  };

  // Function to get the appropriate image source or show currency code for fiat
  const getCurrencyDisplay = (currency: string) => {
    const currencyLower = currency.toLowerCase();
    
    // Check if it's a fiat currency using the comprehensive utility
            if (isValidCurrencyCode(currency)) {
      return {
        type: 'fiat',
        content: currency
      };
    }
    
    // For crypto currencies, use image
    if (failedImages.has(currencyLower)) {
      return {
        type: 'placeholder',
        content: `/placeholder.svg?height=32&width=32&text=${currency}`
      };
    }
    
    return {
      type: 'image',
      content: `/img/crypto/${currencyLower}.webp`
    };
  };

  // Add a useEffect that runs on every render to ensure the step is always marked as complete if a currency is selected
  useEffect(() => {
    if (tradeData.currency) {
      // Use the correct step number (3 for select-crypto-step)
      markStepComplete(3);
    }
  }, [tradeData.currency, markStepComplete]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="relative">
          <Input
            placeholder="Search currencies..."
            disabled
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (filteredCurrencies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="relative">
          <Input
            placeholder="Search currencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Alert>
          <AlertDescription>
            {searchQuery
              ? "No currencies found matching your search."
              : "No currencies available for the selected wallet type."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {t("select_the_currency_you_want_to")}
        {tradeData.tradeType || "trade"}
        {t("from_your")}
        {getWalletTypeName(tradeData.walletType)}
        {t("wallet")}.
      </p>

      <div className="relative mb-4">
        <Input
          placeholder="Search currencies..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      <RadioGroup
        defaultValue={tradeData.currency || ""}
        onValueChange={handleCurrencySelect}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {currentItems.map((currency) => (
          <div key={currency.value} className="relative">
            <RadioGroupItem
              value={currency.value}
              id={`currency-${currency.value}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`currency-${currency.value}`}
              className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {(() => {
                    const display = getCurrencyDisplay(currency.value);
                    if (display.type === 'fiat') {
                      return (
                        <div className="text-xs font-bold text-foreground">
                          {display.content}
                        </div>
                      );
                    } else {
                      return (
                        <img
                          src={display.content || "/placeholder.svg"}
                          alt={currency.label}
                          className="h-8 w-8"
                          onError={() => handleImageError(currency.value)}
                        />
                      );
                    }
                  })()}
                </div>
                <div className="text-sm">{currency.label}</div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            {t("Page")}
            {currentPage}
            {t("of")}
            {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get wallet type name
function getWalletTypeName(walletType: string): string {
  const walletNames: Record<string, string> = {
    FIAT: "Fiat",
    SPOT: "Spot",
    ECO: "Funding",
    FUNDING: "Funding",
  };
  return walletNames[walletType] || "selected";
}
