import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  title?: string;
  description?: string;
}

export function ErrorState({
  title = "Offer Not Found",
  description = "The offer you're looking for doesn't exist or has been removed.",
}: ErrorStateProps) {
  const t = useTranslations("ext");
  return (
    <div className="container max-w-3xl mx-auto py-12">
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>

      <Link href="/p2p/offer">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back_to_offers")}
        </Button>
      </Link>
    </div>
  );
}
