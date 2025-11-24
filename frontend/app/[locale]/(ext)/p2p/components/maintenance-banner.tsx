import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

export function MaintenanceBanner() {
  const t = useTranslations("ext");
  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-300">{t("maintenance_mode")}</AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-400">
        {t("the_p2p_trading_maintenance_mode")}.{" "}
        {t("some_features_may_be_temporarily_unavailable")}.
      </AlertDescription>
    </Alert>
  );
}
