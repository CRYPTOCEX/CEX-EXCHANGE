"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import {
  ChevronLeft,
  CreditCard,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  QrCode,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { $fetch } from "@/lib/api";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import DataTable from "@/components/blocks/data-table";
import { columns } from "../../../history/columns";
import { transactionAnalytics } from "../../../history/analytics";
import { useUserStore } from "@/store/user";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

interface walletAttributes {
  id: string;
  userId: string;
  type: string;
  currency: string;
  address: any;
  balance: number;
  inOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function WalletDetailClient() {
  const t = useTranslations("finance/wallet/[type]/[currency]/client");
  const { currency, type } = useParams() as {
    currency: string;
    type: string;
  };
  const { user } = useUserStore();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [wallet, setWallet] = useState<walletAttributes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddressCopied, setIsAddressCopied] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");

  // Parse address string for ECO wallets
  const parseWalletAddress = (addressString: string) => {
    try {
      return JSON.parse(addressString);
    } catch (error) {
      console.error("Failed to parse wallet address:", error);
      return null;
    }
  };

  // Fetch wallet details from API
  const fetchWalletDetails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/finance/wallet/${type.toUpperCase()}/${currency.toUpperCase()}`,
        method: "GET",
        silentSuccess: true,
      });

      if (error) {
        throw new Error(error || "Failed to fetch wallet details");
      }

      setWallet(data);

      // Parse address for ECO wallets
      if (
        data?.type === "ECO" &&
        data?.address &&
        typeof data.address === "string"
      ) {
        const parsedAddress = parseWalletAddress(data.address);
        if (parsedAddress) {
          data.address = parsedAddress;
          const networks = Object.keys(parsedAddress);
          if (networks.length > 0 && !selectedNetwork) {
            setSelectedNetwork(networks[0]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching wallet details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch wallet details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, [type, currency]);

  // Copy wallet address to clipboard
  const copyAddressToClipboard = () => {
    if (!wallet?.address || wallet.type !== "ECO" || !selectedNetwork) return;

    const addressData = wallet.address[selectedNetwork];
    if (!addressData?.address) return;

    navigator.clipboard.writeText(addressData.address).then(
      () => {
        setIsAddressCopied(true);
        toast({
          title: "Address Copied",
          description: "Wallet address copied to clipboard",
        });

        setTimeout(() => {
          setIsAddressCopied(false);
        }, 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          title: "Error",
          description: "Failed to copy address. Please try again.",
          variant: "destructive",
        });
      }
    );
  };

  // Navigate to action pages
  const navigateToDeposit = () => {
    router.push(
      `/finance/deposit?wallet=${type.toLowerCase()}&currency=${currency.toLowerCase()}`
    );
  };

  const navigateToWithdraw = () => {
    router.push(
      `/finance/withdraw?wallet=${type.toLowerCase()}&currency=${currency.toLowerCase()}`
    );
  };

  const navigateToTransfer = () => {
    router.push(
      `/finance/transfer?wallet=${type.toLowerCase()}&currency=${currency.toLowerCase()}`
    );
  };

  // Show loader while fetching data
  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="mr-2"
            onClick={() => router.push("/finance/wallet")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t("Back")}</span>
          </Button>
          <Skeleton className="h-6 w-32 sm:h-8 sm:w-48" />
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>

            <div className="pt-4 sm:pt-6 border-t">
              <Skeleton className="h-40 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12">
        <div className="text-center">
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-3 rounded-full inline-flex mb-4">
            <Wallet className="h-6 w-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            {t("wallet_not_found")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("the_wallet_youre_to_it")}.
          </p>
          <Button onClick={() => router.push("/finance/wallet")}>
            {t("go_to_wallets")}
          </Button>
        </div>
      </div>
    );
  }

  // Define colors based on wallet type
  const getWalletColors = () => {
    switch (wallet.type) {
      case "FIAT":
        return {
          bg: "bg-green-100 dark:bg-green-900/30",
          text: "text-green-700 dark:text-green-300",
          border: "border-green-200 dark:border-green-800",
          button: "bg-green-500 hover:bg-green-600",
          icon: "text-green-500",
        };
      case "SPOT":
        return {
          bg: "bg-blue-100 dark:bg-blue-900/30",
          text: "text-blue-700 dark:text-blue-300",
          border: "border-blue-200 dark:border-blue-800",
          button: "bg-blue-500 hover:bg-blue-600",
          icon: "text-blue-500",
        };
      case "ECO":
        return {
          bg: "bg-purple-100 dark:bg-purple-900/30",
          text: "text-purple-700 dark:text-purple-300",
          border: "border-purple-200 dark:border-purple-800",
          button: "bg-purple-500 hover:bg-purple-600",
          icon: "text-purple-500",
        };
      case "FUTURES":
        return {
          bg: "bg-amber-100 dark:bg-amber-900/30",
          text: "text-amber-700 dark:text-amber-300",
          border: "border-amber-200 dark:border-amber-800",
          button: "bg-amber-500 hover:bg-amber-600",
          icon: "text-amber-500",
        };
      default:
        return {
          bg: "bg-gray-100 dark:bg-zinc-800",
          text: "text-gray-700 dark:text-zinc-300",
          border: "border-gray-200 dark:border-zinc-700",
          button: "bg-gray-500 hover:bg-gray-600",
          icon: "text-gray-500",
        };
    }
  };

  const colors = getWalletColors();

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    if (isMobile) {
      return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
    }
    return address.length > 24
      ? `${address.substring(0, 12)}...${address.substring(address.length - 12)}`
      : address;
  };

  // Get current address data for ECO wallets
  const getCurrentAddressData = () => {
    if (wallet.type !== "ECO" || !wallet.address || !selectedNetwork) {
      return null;
    }

    let parsedAddress = wallet.address;
    if (typeof wallet.address === "string") {
      parsedAddress = parseWalletAddress(wallet.address);
    }

    if (!parsedAddress || !parsedAddress[selectedNetwork]) {
      return null;
    }

    // The actual structure only has balance, so we'll create a mock address
    return {
      address: `${selectedNetwork}_${wallet.currency}_${wallet.id.substring(0, 8)}`, // Generate a mock address
      network: selectedNetwork,
      balance: parsedAddress[selectedNetwork].balance || 0,
    };
  };

  const currentAddressData = getCurrentAddressData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* Header with back button */}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          className="mr-2"
          onClick={() => router.push("/finance/wallet")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">{t("Back")}</span>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">
          {wallet.currency} {t(`wallet_type_${wallet.type.toLowerCase()}`)} {t("Wallet")}
        </h1>
      </div>

      {/* Wallet Overview Card */}
      <Card className="overflow-hidden border-none bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Wallet main info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center">
                <div className={`p-2 mr-2 rounded-lg ${colors.bg}`}>
                  <CreditCard
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${colors.icon}`}
                  />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {wallet.currency}
                  </h2>
                  <p className="text-lg font-semibold">
                    {t("balance")}
                    {wallet.balance?.toFixed(8) || "0.00000000"}
                  </p>
                  {wallet.inOrder && wallet.inOrder > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("in_order")}
                      {wallet.inOrder?.toFixed(8) || "0.00000000"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Wallet actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                size={isMobile ? "sm" : "default"}
                onClick={navigateToDeposit}
                className="flex-1 sm:flex-none"
              >
                <ArrowDownToLine className="h-4 w-4 mr-1.5" />
                <span>{t("Deposit")}</span>
              </Button>
              <Button
                size={isMobile ? "sm" : "default"}
                onClick={navigateToWithdraw}
                className="flex-1 sm:flex-none"
              >
                <ArrowUpFromLine className="h-4 w-4 mr-1.5" />
                <span>{t("Withdraw")}</span>
              </Button>
              <Button
                size={isMobile ? "sm" : "default"}
                onClick={navigateToTransfer}
                className="flex-1 sm:flex-none"
              >
                <ArrowLeftRight className="h-4 w-4 mr-1.5" />
                <span>{t("Transfer")}</span>
              </Button>
            </div>
          </div>

          {/* Wallet address section (only for ECO wallets) */}
          {wallet.type === "ECO" && wallet.address && (
            <div className="pt-4 sm:pt-6 border-t">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("wallet_address")}
                </span>
                {Object.keys(wallet.address).length > 1 && (
                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="text-sm border rounded px-2 py-1 bg-background"
                  >
                    {Object.keys(wallet.address).map((network) => (
                      <option key={network} value={network}>
                        {network}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {currentAddressData && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    <span>{t("network")}</span>
                    <span className="font-medium">
                      {currentAddressData.network}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    <span>{t("network_balance")}</span>
                    <span className="font-medium">
                      {currentAddressData?.balance?.toFixed(8) || "0.00000000"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Transactions */}
      <DataTable
        apiEndpoint="/api/finance/transaction"
        model="transaction"
        modelConfig={{
          userId: user?.id,
          walletId: wallet?.id,
        }}
        userAnalytics={true}
        pageSize={10}
        isParanoid={false}
        canView={true}
        title="Transactions History"
        itemTitle="Transaction"
        columns={columns}
        analytics={transactionAnalytics}
      />
    </motion.div>
  );
}
