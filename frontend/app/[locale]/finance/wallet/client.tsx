"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { WalletStats } from "./components/wallet-stats";
import { WalletOverview } from "./components/wallet-overview";
import { WalletList } from "./components/wallet-list";
import { WalletActions } from "./components/wallet-actions";
import { useWalletStore } from "@/store/finance/wallet-store";
import { motion } from "framer-motion";
import { PendingTransactions } from "./components/pending-transactions";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { walletAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export function WalletDashboard() {
  const t = useTranslations("finance/wallet/client");
  const { hasKyc, canAccessFeature, user } = useUserStore();
  const { settings } = useConfigStore();
  const router = useRouter();
  const { isLoading, fetchWallets } = useWalletStore();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchWallets();
  }, []);

  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasKycApproved = hasKyc();
  const hasWalletFeature = canAccessFeature("view_wallets");

  // Only check for KYC approval if KYC is enabled
  // If user has KYC approved but no feature, they need a higher level
  if (kycEnabled) {
    if (!hasKycApproved) {
      return <KycRequiredNotice feature="view_wallets" />;
    }
    if (!hasWalletFeature) {
      // User has KYC but needs higher level for wallet access
      return <KycRequiredNotice feature="view_wallets" />;
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader size="lg" />
          <span className="text-muted-foreground">
            {t("loading_your_wallets")}
          </span>
        </div>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <div className="px-2 sm:px-0">
      <PendingTransactions />
      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="space-y-4 sm:space-y-8"
      >
        <motion.div variants={item}>
          <Card className="overflow-hidden border-none bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm shadow-xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {t("your_wallets")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("manage_all_your_wallets_in_one_place")}
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/finance/deposit")}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  size={isMobile ? "sm" : "default"}
                >
                  {t("add_funds")}
                </Button>
              </div>

              <WalletStats />
            </CardContent>
          </Card>
        </motion.div>

        <DataTable
          apiEndpoint="/api/finance/wallet"
          model="wallet"
          modelConfig={{
            userId: user?.id,
          }}
          pageSize={10}
          canView={true}
          viewLink="/finance/wallet/[type]/[currency]"
          isParanoid={false}
          title="Wallets Overview"
          itemTitle="Wallet"
          columns={columns}
        />
      </motion.div>
    </div>
  );
}

export default WalletDashboard;
