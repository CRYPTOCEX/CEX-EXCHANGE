"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useForexStore } from "@/store/forex/user";
import { formatCurrency } from "@/utils/formatters";
import TradeLoading from "./loading";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface WindowSize {
  width: number;
  height: number;
}

export default function TradeClient() {
  const t = useTranslations("ext");
  const { id } = useParams();
  const router = useRouter();
  const { accounts, hasFetchedAccounts, fetchAccounts } = useForexStore();
  const [account, setAccount] = useState<forexAccountAttributes | null>(null);
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: 1200,
    height: 800,
  });

  // Fetch accounts if they haven't been fetched yet
  useEffect(() => {
    if (!hasFetchedAccounts) {
      fetchAccounts();
    }
  }, [hasFetchedAccounts]);

  // Once accounts are loaded, locate the account by id and ensure accountId is defined
  useEffect(() => {
    if (!accounts.length) return; // Wait until accounts are available
    const foundAccount = accounts.find((a) => a.id === id);
    if (foundAccount) {
      setAccount(foundAccount);
    } else {
      // Redirect if account not found
      router.push("/forex/dashboard");
    }
  }, [id, accounts, router]);

  // Update window size for iframe dimensions
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!account) {
    return <TradeLoading />;
  }

  return (
    <div className="flex flex-col">
      {/* Account Info Bar */}
      <div className="bg-gray-100 border-b border-gray-200 dark:bg-zinc-900 dark:border-zinc-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="dark:text-white"
                onClick={() => router.push("/forex/dashboard")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back_to_dashboard")}
              </Button>

              <div className="h-6 w-px bg-gray-300 hidden sm:block dark:bg-gray-600"></div>

              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-800 dark:text-white">
                  {account.broker || "No Broker"}
                </span>
                <Badge
                  className={
                    account.type === "LIVE"
                      ? "bg-green-500 dark:bg-green-600 dark:text-white"
                      : "bg-blue-500 dark:bg-blue-600 dark:text-white"
                  }
                >
                  {account.type}
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-600 mr-1 dark:text-gray-300">
                  {t("account")}
                </span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {account.accountId}
                </span>
              </div>

              <div className="text-sm">
                <span className="text-gray-600 mr-1 dark:text-gray-300">
                  {t("balance")}
                </span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {formatCurrency(account.balance ?? 0)}
                </span>
              </div>

              <div className="text-sm">
                <span className="text-gray-600 mr-1 dark:text-gray-300">
                  {t("leverage")}
                </span>
                <span className="font-medium text-gray-800 dark:text-white">
                  1:{account.leverage || "100"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Platform */}
      <div className="flex-1 bg-gray-900 dark:bg-black">
        <iframe
          key={account.accountId}
          src={`https://metatraderweb.app/trade?servers=${account.broker || ""}&trade_server=${account.broker || ""}&startup_mode=${
            account.type === "DEMO" ? "open_demo" : "open_trade"
          }&startup_version=${account.mt || "5"}&lang=EN&save_password=on&login=${
            account.accountId || ""
          }&password=${account.password || ""}&leverage=${account.leverage || "100"}`}
          allowFullScreen
          style={{
            height: `calc(90vh - 90px)`,
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}
