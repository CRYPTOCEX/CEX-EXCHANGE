import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  error?: string | null;
  notFound?: boolean;
}

export default function AffiliateDetailErrorState({ error, notFound }: ErrorStateProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  if (notFound) {
    return (
      <div className="container mx-auto py-4 md:py-6 px-4 md:px-6 space-y-6 pt-20">
        <div className="flex items-center gap-2">
          <Link href="/admin/affiliate/referral">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">
            {t("affiliate_not_found")}
          </h1>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tCommon("no_data_available")}</AlertTitle>
          <AlertDescription>
            {t("the_requested_affiliate_could_not_be")}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/admin/affiliate/referral">
            <Button>
              {t("return_to_affiliates")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 md:px-6 space-y-6 pt-20">
      <div className="flex items-center gap-2">
        <Link href="/admin/affiliate/referral">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold">Error</h1>
      </div>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("error_loading_affiliate_data")}</AlertTitle>
        <AlertDescription>{error || "An error occurred while loading affiliate data"}</AlertDescription>
      </Alert>
    </div>
  );
}
