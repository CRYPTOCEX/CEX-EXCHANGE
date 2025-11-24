import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function EmptySearchState() {
  const t = useTranslations("trade/components/markets/empty-search-state");
  return (
    <div className="flex items-center justify-center h-32 text-muted-foreground dark:text-zinc-500">
      <div className="text-center">
        <Search className="h-5 w-5 mx-auto mb-2 opacity-30" />
        <p className="text-xs">{t("no_markets_found")}</p>
      </div>
    </div>
  );
}
