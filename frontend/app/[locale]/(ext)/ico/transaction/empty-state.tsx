import { Receipt } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TransactionsEmptyState() {
  const t = useTranslations("ext");
  const tExtIco = useTranslations("ext_ico");
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl p-12 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-400/10 dark:bg-cyan-400/20 mb-6">
        <Receipt className="h-10 w-10 text-cyan-500 dark:text-cyan-400" />
      </div>
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
        {t("no_transactions_yet")}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
        {tExtIco("your_ico_transaction_history_will_appear")}
      </p>
    </div>
  );
}
