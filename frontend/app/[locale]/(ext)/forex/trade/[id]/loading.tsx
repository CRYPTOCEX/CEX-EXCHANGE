import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function TradeLoading() {
  const t = await getTranslations("ext_forex");
  return (
    <div className="h-screen w-full flex items-center justify-center bg-surface-2">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-success" />
        <p className="text-muted-foreground">{t("loading_trading_terminal")}…</p>
      </div>
    </div>
  );
}
