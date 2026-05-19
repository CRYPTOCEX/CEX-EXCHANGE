import { Wallet, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function EmptyPortfolioState() {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl p-12 text-center">
      <div className={"inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 mb-6"}>
        <Wallet className={"h-10 w-10 text-teal-600 dark:text-teal-400"} />
      </div>
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
        {tCommon("start_your_investment_journey")}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
        {t("you_havent_made_any_ico_investments_yet")} {t("explore_our_token_offerings_and_start")}
      </p>
      <Link href="/ico/offer">
        <Button
          size="lg"
          className={"bg-linear-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl shadow-lg"}
        >
          <Rocket className="mr-2 h-5 w-5" />
          {t("explore_token_offerings")}
        </Button>
      </Link>
    </div>
  );
}
