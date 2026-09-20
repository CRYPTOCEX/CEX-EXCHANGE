import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function EmptySearchState() {
  const t = useTranslations("common");
  return (
    <div className="flex h-32 items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Search className="mx-auto mb-2 h-5 w-5 opacity-30" />
        <p className="text-xs">{t("no_markets_found")}</p>
      </div>
    </div>
  );
}
