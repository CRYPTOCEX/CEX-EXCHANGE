import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  error?: string | null;
  noData?: boolean;
}

export default function AffiliateNetworkErrorState({ error, noData }: ErrorStateProps) {
  const t = useTranslations("ext_affiliate");
  if (noData) {
    return (
      <Alert className="mx-auto max-w-2xl my-8 mt-20">
        <Info className="h-4 w-4" />
        <AlertTitle>{t("no_network_data")}</AlertTitle>
        <AlertDescription>
          {t("no_network_data_is_available_1")} {t("start_building_your_network_by_referring_friends_1")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="mx-auto max-w-2xl my-8 mt-20">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error || "An error occurred while loading network data"}</AlertDescription>
    </Alert>
  );
}
