import { Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface EmptyStateProps {
  onReset?: () => void;
}

export default function PlansEmptyState({ onReset }: EmptyStateProps) {
  const t = useTranslations("common");
  const tExtForex = useTranslations("ext_forex");
  return (
    <div className="text-center py-16">
      <div
        className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-600/10 dark:bg-emerald-600/20 mb-6`}
      >
        <Search
          className={`h-10 w-10 text-emerald-600 dark:text-emerald-400`}
        />
      </div>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        {t("no_plans_found")}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-6">
        {tExtForex("we_couldnt_find_any_plans_matching_your_criteria_1")}{" "}
        {tExtForex("try_adjusting_your_filters_or_search_term_1")}
      </p>
      {onReset && (
        <Button
          variant="outline"
          onClick={onReset}
          className={`rounded-xl border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/5 dark:text-emerald-400 dark:hover:bg-emerald-600/10`}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          {t("reset_filters")}
        </Button>
      )}
    </div>
  );
}
