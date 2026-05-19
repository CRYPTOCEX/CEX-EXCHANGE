import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function InvestmentsEmptyState() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl p-12 text-center">
      <div
        className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-600/10 dark:bg-emerald-600/20 mb-6`}
      >
        <TrendingUp
          className={`h-10 w-10 text-emerald-600 dark:text-emerald-400`}
        />
      </div>
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
        {tCommon("no_investments_yet")}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
        {t("you_havent_made_any_investments_yet")}{" "}
        {t("start_your_forex_trading_journey_by")}
      </p>
      <Link href="/forex/plan">
        <Button
          size="lg"
          className={`bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg`}
        >
          <TrendingUp className="mr-2 h-5 w-5" />
          {t("browse_investment_plans")}
        </Button>
      </Link>
    </div>
  );
}
