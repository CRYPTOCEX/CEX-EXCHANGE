"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useWizard } from "../trading-wizard";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Wallet, Landmark, Sprout, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
interface WalletOption {
  id: string;
  name: string;
}
interface UserWallet {
  id: string;
  userId: string;
  type: string;
  currency: string;
  currencyName: string;
  symbol: string;
  balance: number;
  availableBalance: number;
  inOrder?: number;
  status: boolean;
}
export function WalletTypeStep() {
  const { tradeData, updateTradeData, markStepComplete } = useWizard();
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For sell flow - user wallets of selected type
  const [userWallets, setUserWallets] = useState<UserWallet[]>([]);
  const [selectedUserWallet, setSelectedUserWallet] = useState<string>("");
  const [loadingUserWallets, setLoadingUserWallets] = useState(false);

  // Memoize the trade type to prevent unnecessary rerenders
  const tradeType = useMemo(() => tradeData.tradeType, [tradeData.tradeType]);

  // Fetch user wallets of selected type (for sell flow)
  const fetchUserWallets = useCallback(
    async (walletType: string) => {
      if (!walletType) return;
      try {
        setLoadingUserWallets(true);
        setError(null);
        const response = await fetch(`/api/finance/wallet/${walletType}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user wallets");
        }
        const data = await response.json();
        if (data.success && data.data) {
          setUserWallets(data.data);

          // If we have wallets and none selected yet, select the first one
          if (data.data.length > 0 && !selectedUserWallet) {
            setSelectedUserWallet(data.data[0].id);
            updateTradeData({
              userWalletId: data.data[0].id,
              currency: data.data[0].currency,
              availableBalance: data.data[0].availableBalance,
            });
            markStepComplete(2);
          } else if (data.data.length === 0) {
            setError(
              `You don't have any ${walletType.toLowerCase()} wallets with balance.`
            );
          }
        }
      } catch (err) {
        console.error("Error fetching user wallets:", err);
        setError("Failed to load your wallets. Please try again.");
      } finally {
        setLoadingUserWallets(false);
      }
    },
    [selectedUserWallet, updateTradeData, markStepComplete]
  );

  // Fetch wallet options from API - only run once on component mount
  useEffect(() => {
    const fetchWalletOptions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/finance/wallet/options");
        const data = await response.json();
        if (!response.ok) {
          throw new Error("Failed to fetch wallet options");
        }
        setWalletOptions(data);

        // Set default selection if we have options
        if (data.length > 0 && !selectedWallet) {
          const defaultWallet = data[0].id;
          setSelectedWallet(defaultWallet);
          updateTradeData({
            walletType: defaultWallet,
          });

          // If selling, fetch user wallets of this type
          if (tradeType === "SELL") {
            fetchUserWallets(defaultWallet);
          } else {
            markStepComplete(2);
          }
        }
      } catch (err) {
        console.error("Error fetching wallet options:", err);
        setError("Failed to load wallet options. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchWalletOptions();
    // Only run this effect once on mount and when fetchUserWallets changes
  }, [fetchUserWallets]);

  // Handle wallet selection with useCallback to prevent recreation on each render
  const handleWalletSelect = useCallback(
    (value: string) => {
      // Batch state updates to reduce rerenders
      setSelectedWallet(value);
      updateTradeData({
        walletType: value,
      });

      // If selling, fetch user wallets of this type
      if (tradeType === "SELL") {
        setSelectedUserWallet("");
        setUserWallets([]);
        fetchUserWallets(value);
      } else {
        markStepComplete(2);
      }
    },
    [tradeType, fetchUserWallets, updateTradeData, markStepComplete]
  );

  // Handle user wallet selection with useCallback
  const handleUserWalletSelect = useCallback(
    (wallet: UserWallet) => {
      setSelectedUserWallet(wallet.id);
      updateTradeData({
        userWalletId: wallet.id,
        currency: wallet.currency,
        availableBalance: wallet.availableBalance,
      });
      markStepComplete(2);
    },
    [updateTradeData, markStepComplete]
  );

  // Memoize wallet UI helper functions to prevent recreation on each render
  const getWalletIcon = useCallback((walletId: string) => {
    switch (walletId) {
      case "FIAT":
        return <Landmark className="mb-3 h-6 w-6" />;
      case "ECO":
        return <Sprout className="mb-3 h-6 w-6" />;
      case "SPOT":
      default:
        return <Wallet className="mb-3 h-6 w-6" />;
    }
  }, []);
  const getWalletDescription = useCallback((walletId: string) => {
    switch (walletId) {
      case "FIAT":
        return "For traditional currency transactions like USD, EUR, GBP. Use this wallet for buying or selling crypto with fiat currencies.";
      case "ECO":
        return "For staking, lending, and earning interest on crypto assets. This wallet offers various yield-generating opportunities.";
      case "SPOT":
      default:
        return "For direct currency trading and exchanges. This is the standard wallet for holding and trading cryptocurrencies.";
    }
  }, []);
  const getWalletFeatures = useCallback((walletId: string) => {
    switch (walletId) {
      case "FIAT":
        return ["Bank Transfers", "Card Payments", "P2P Trading"];
      case "ECO":
        return ["Staking", "Lending", "Yield Farming"];
      case "SPOT":
      default:
        return ["Instant Trading", "Withdrawals", "Deposits"];
    }
  }, []);

  // Memoize the wallet options rendering to prevent recreation on each render
  const walletOptionsUI = useMemo(
    () => (
      <RadioGroup
        value={selectedWallet || ""}
        onValueChange={handleWalletSelect}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {walletOptions.map((wallet) => (
          <div key={wallet.id}>
            <RadioGroupItem
              value={wallet.id}
              id={wallet.id}
              className="peer sr-only"
            />
            <Label
              htmlFor={wallet.id}
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary h-full"
            >
              {getWalletIcon(wallet.id)}
              <div className="text-center space-y-1">
                <h3 className="font-medium">{wallet.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {getWalletDescription(wallet.id)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1 justify-center">
                {getWalletFeatures(wallet.id).map((feature) => (
                  <span
                    key={feature}
                    className="text-xs bg-muted px-2 py-1 rounded-full"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    ),
    [
      walletOptions,
      selectedWallet,
      handleWalletSelect,
      getWalletIcon,
      getWalletDescription,
      getWalletFeatures,
    ]
  );

  // Memoize the user wallets UI to prevent recreation on each render
  const userWalletsUI = useMemo(() => {
    if (tradeType !== "SELL" || !selectedWallet) return null;
    if (loadingUserWallets) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      );
    }
    if (userWallets.length > 0) {
      return (
        <div className="grid gap-4">
          {userWallets.map((wallet) => {
            return (
              <Card
                key={wallet.id}
                className={`cursor-pointer transition-all ${selectedUserWallet === wallet.id ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"}`}
                onClick={() => handleUserWalletSelect(wallet)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{wallet.currencyName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {wallet.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {wallet.availableBalance.toLocaleString()}{" "}
                        {wallet.symbol}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Available Balance
                      </p>
                    </div>
                    {selectedUserWallet === wallet.id && (
                      <div className="absolute top-3 right-3">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }
    return (
      <Alert>
        <AlertDescription>
          You don't have any {selectedWallet.toLowerCase()} wallets with
          balance. Please select a different wallet type or add funds to your
          wallet.
        </AlertDescription>
      </Alert>
    );
  }, [
    tradeType,
    selectedWallet,
    loadingUserWallets,
    userWallets,
    selectedUserWallet,
    handleUserWalletSelect,
  ]);

  // Add a useEffect that runs on every render to ensure the step is always marked as complete if a wallet type is selected
  useEffect(() => {
    if (tradeData.walletType) {
      // Use the correct step number (2 for wallet-type-step)
      markStepComplete(2);
    }
  }, [tradeData.walletType, markStepComplete]);
  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading wallet options...</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (error && tradeType !== "SELL") {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Select the wallet type you want to use for this {tradeType || "trade"}.
      </p>

      {walletOptionsUI}

      {selectedWallet && (
        <div className="bg-muted p-4 rounded-md">
          <h4 className="font-medium mb-2">
            About{" "}
            {walletOptions.find((w) => w.id === selectedWallet)?.name ||
              "this wallet type"}
          </h4>
          <p className="text-sm text-muted-foreground">
            {getWalletDescription(selectedWallet)}
          </p>
        </div>
      )}

      {/* Show user wallets for sell flow */}
      {tradeType === "SELL" && selectedWallet && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">
            Select a wallet to sell from
          </h3>
          {userWalletsUI}
        </div>
      )}
    </div>
  );
}
