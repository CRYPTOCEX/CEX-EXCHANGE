import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SubscriptionLoading() {
  const t = useTranslations("ext_copy-trading");
  return (
    <div className="min-h-screen flex items-center justify-center pt-20 bg-linear-to-b from-background to-muted/20 dark:from-zinc-950 dark:to-zinc-900/50">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-zinc-500">{t("loading_subscriptions_ellipsis")}</p>
      </div>
    </div>
  );
}
