"use client";

import { useOfflineTransactions } from "@/hooks/use-offline-transactions";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { m, AnimatePresence } from "framer-motion";

export function PendingTransactions() {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const {
    pendingTransactions,
    syncing,
    online,
    syncTransactions,
    hasPendingTransactions,
  } = useOfflineTransactions();

  if (!hasPendingTransactions) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mb-5 overflow-hidden rounded-2xl border border-warning/30 bg-linear-to-r from-warning/10 via-warning/5 to-warning/10 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-warning/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning text-warning-foreground shadow-lg shadow-warning/30">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                {pendingTransactions.length} {tCommon("pending_transaction")}
                {pendingTransactions.length !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-warning">
                {online ? (
                  <>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> {t("online_ready_to_sync")}
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" /> {t("offline_will_sync_when_online")}
                  </>
                )}
              </div>
            </div>
          </div>
          {online && (
            <Button
              size="sm"
              tone="warning"
              onClick={syncTransactions}
              disabled={syncing}
              className="h-8 gap-1.5"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("syncing")}
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  {t("sync_now")}
                </>
              )}
            </Button>
          )}
        </div>

        <div className="max-h-40 space-y-1 overflow-y-auto p-3">
          {pendingTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg border border-warning/10 bg-card/60 p-2 text-xs dark:bg-surface-2/40"
            >
              <span className="font-semibold text-foreground">{tx.type}</span>
              <span className="text-warning tabular-nums">
                {tx.amount} {tx.currency}
              </span>
              <span className="text-subtle-foreground">
                {new Date(tx.timestamp || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </m.div>
    </AnimatePresence>
  );
}
