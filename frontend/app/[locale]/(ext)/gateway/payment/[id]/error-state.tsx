import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  error?: string;
  onRetry?: () => void;
}

export default function PaymentErrorState({ error, onRetry }: ErrorStateProps) {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return (
    <div className="space-y-6 pt-20">
      <Link href="/gateway/payment">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tExt("back_to_payments")}
        </Button>
      </Link>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || tExt("payment_not_found")}</AlertDescription>
      </Alert>
      {onRetry && (
        <div className="flex justify-center">
          <Button onClick={onRetry}>{tCommon("try_again")}</Button>
        </div>
      )}
    </div>
  );
}
