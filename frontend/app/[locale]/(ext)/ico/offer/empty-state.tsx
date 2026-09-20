import { Search, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface EmptyStateProps {
  onReset?: () => void;
  message?: string;
}

export default function OffersEmptyState({ onReset, message }: EmptyStateProps) {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  return (
    <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-12">
      <div className={"inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 mb-6"}>
        <Search className={"h-10 w-10 text-teal-600 dark:text-teal-400"} />
      </div>
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
        {t("no_offerings_found")}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
        {message || "We couldn't find any token offerings matching your criteria. Try adjusting your filters or search term."}
      </p>
      {onReset && (
        <Button
          variant="outline"
          onClick={onReset}
          className={"rounded-xl border-teal-500/30 text-teal-600 hover:bg-teal-500/5 dark:text-teal-400 dark:hover:bg-teal-500/10"}
        >
          <Rocket className="mr-2 h-4 w-4" />
          {tCommon("reset_filters")}
        </Button>
      )}
    </div>
  );
}
