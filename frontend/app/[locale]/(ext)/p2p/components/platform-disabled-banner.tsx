import { XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

export function PlatformDisabledBanner() {
  const t = useTranslations("ext");
  return (
    <Alert 
      variant="destructive" 
      className="mb-6 border-red-200 bg-red-50 text-red-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-red-300"
    >
      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      <AlertTitle className="text-red-800 dark:text-red-300">{t("p2p_trading_disabled")}</AlertTitle>
      <AlertDescription className="text-red-700 dark:text-red-400">
        {t("p2p_trading_is_currently_disabled_on_the_platform")}.{" "}
        {t("please_check_back_later")}.
      </AlertDescription>
    </Alert>
  );
}
