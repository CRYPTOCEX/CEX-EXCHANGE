import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  error: string;
}

export default function AffiliateRewardsErrorState({ error }: ErrorStateProps) {
  const t = useTranslations("ext_affiliate");
  return (
    <div className="container mx-auto px-4 py-6 pt-20 md:px-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold text-destructive mb-2">{t("error_loading_rewards")}</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    </div>
  );
}
