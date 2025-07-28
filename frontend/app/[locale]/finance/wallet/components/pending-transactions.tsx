"use client";

import { useOfflineTransactions } from "@/hooks/use-offline-transactions";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function PendingTransactions() {
  const t = useTranslations("finance/wallet/components/pending-transactions");
  const {
    pendingTransactions,
    syncing,
    online,
    syncTransactions,
    hasPendingTransactions,
  } = useOfflineTransactions();

  if (!hasPendingTransactions) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
          <h3 className="font-medium text-yellow-800">
            {pendingTransactions.length} {t("pending_transaction")}
            {pendingTransactions.length !== 1 ? "s" : ""}
          </h3>
        </div>
        {online && (
          <Button
            size="sm"
            variant="outline"
            onClick={syncTransactions}
            disabled={syncing}
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("Syncing")}.
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t("sync_now")}
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {pendingTransactions.map((tx) => (
          <div
            key={tx.id}
            className="bg-white p-3 rounded border border-yellow-100 text-sm"
          >
            <div className="flex justify-between">
              <span className="font-medium">{tx.type}</span>
              <span className="text-yellow-700">
                {tx.amount} {tx.currency}
              </span>
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {new Date(tx.timestamp || 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-yellow-600 mt-3">
        {online
          ? "These transactions will be processed when you sync."
          : "These transactions will be processed when you're back online."}
      </p>
    </div>
  );
}
