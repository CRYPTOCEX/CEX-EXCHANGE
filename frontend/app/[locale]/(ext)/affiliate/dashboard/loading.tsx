import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AffiliateDashboardLoading() {
  const t = useTranslations("ext");
  return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-zinc-500">{t("loading_dashboard_ellipsis")}</p>
      </div>
    </div>
  );
}
