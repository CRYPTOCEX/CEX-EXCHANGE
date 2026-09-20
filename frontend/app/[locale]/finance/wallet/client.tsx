"use client";

import { useEffect } from "react";
import { m } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  History,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useWalletStore } from "@/store/finance/wallet-store";
import { useUserStore } from "@/store/user";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { useTranslations } from "next-intl";
import { Loader } from "@/components/ui/loader";

import { FinanceShell, QuickActionTile } from "../_components/finance-ui";
import { WalletHero } from "./components/wallet-hero";
import { PendingTransactions } from "./components/pending-transactions";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useViewConfig } from "./columns";

export function WalletDashboard() {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const { isLoading, fetchWallets } = useWalletStore();
  const columns = useColumns();
  const viewConfig = useViewConfig();
  const gate = useKycGate("view_wallets");

  useEffect(() => {
    fetchWallets();
  }, []);

  const loadingView = (
    <FinanceShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-subtle-foreground">
          <Loader size="lg" />
          <span className="text-sm">{t("loading_your_wallets")}</span>
        </div>
      </div>
    </FinanceShell>
  );

  // Neither "loading" nor "anonymous" is a KYC problem: the old gate ignored
  // `user` entirely, so a logged-out visitor — and every user during the
  // SSR-to-hydration window — was shown the KYC notice instead.
  if (gate.state === "loading") {
    return loadingView;
  }
  if (gate.state === "anonymous") {
    return null;
  }

  if (!gate.allowed) {
    return (
      <FinanceShell>
        <KycRequiredNotice
          feature="view_wallets"
          requirement={gate.requirement ?? "verification"}
        />
      </FinanceShell>
    );
  }

  if (isLoading) {
    return loadingView;
  }

  return (
    <FinanceShell>
      <PendingTransactions />

      <m.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
        className="space-y-5 sm:space-y-6"
      >
        {/* Hero */}
        <WalletHero />

        {/* Quick action tiles */}
        <m.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <QuickActionTile
            title={tCommon("deposit")}
            description={t("add_funds_to_your_account")}
            icon={ArrowDownToLine}
            tone="green"
            onClick={() => router.push("/finance/deposit")}
          />
          <QuickActionTile
            title={tCommon("withdraw")}
            description={t("send_funds_externally")}
            icon={ArrowUpFromLine}
            tone="rose"
            onClick={() => router.push("/finance/withdraw")}
          />
          <QuickActionTile
            title={tCommon("transfer")}
            description={t("move_between_wallets")}
            icon={ArrowLeftRight}
            tone="blue"
            data-tour="wallet-transfer"
            onClick={() => router.push("/finance/transfer")}
          />
          <QuickActionTile
            title={tCommon("history")}
            description={tCommon("view_transactions")}
            icon={History}
            tone="violet"
            onClick={() => router.push("/finance/history")}
          />
        </m.div>

        {/* Wallets table — proven DataTable */}
        <m.div
          data-tour="wallet-types"
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <DataTable
            apiEndpoint="/api/finance/wallet"
            model="wallet"
            modelConfig={{
              userId: user?.id,
            }}
            pageSize={12}
            canView={true}
            viewLink="/finance/wallet/[type]/[currency]"
            isParanoid={false}
            title={t("wallets_overview")}
            itemTitle="Wallet"
            columns={columns}
            viewConfig={viewConfig}
          />
        </m.div>
      </m.div>
    </FinanceShell>
  );
}

export default WalletDashboard;
