import { BarChart3, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EmptyAccountsState() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl p-8">
      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className={`w-20 h-20 rounded-2xl bg-emerald-600/10 dark:bg-emerald-600/20 flex items-center justify-center`}
        >
          <BarChart3 className={`h-10 w-10 text-emerald-600`} />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
          {t("creating_your_trading_account")}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-md">
          {t("your_trading_account_is_being_created_by_our_team")}{" "}
          {t("you_will_receive_an_email_once_it_is_ready")}
        </p>
        <div
          className={`flex items-center space-x-2 text-emerald-600 dark:text-emerald-400`}
        >
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="font-medium">{tCommon("processing_request")}</span>
        </div>
      </div>
    </div>
  );
}
