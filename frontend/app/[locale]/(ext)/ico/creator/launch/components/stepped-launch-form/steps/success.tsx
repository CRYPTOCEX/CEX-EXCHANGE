import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface SuccessStepProps {
  name: string;
  symbol: string;
}

export default function SuccessStep({ name, symbol }: SuccessStepProps) {
  const t = useTranslations("ext");
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
      <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="h-12 w-12 text-primary" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          {t("application_submitted_successfully")}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t("your_token_launch_application_for")}
          {name}
          (
          {symbol}
          {t(")_has_been_submitted_and_is_now_pending_review")}.
        </p>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg max-w-md mx-auto w-full">
        <h3 className="font-medium mb-2">{t("what_happens_next")}</h3>
        <ol className="text-left space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
              1:
            </span>
            <span>{t("our_team_will_business_days")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
              2
            </span>
            <span>{t("youll_receive_an_review_results")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
              3
            </span>
            <span>{t("if_approved_well_your_token")}</span>
          </li>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Link href="/ico/dashboard" className="w-full">
          <Button variant="default" className="w-full">
            {t("go_to_dashboard")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/ico/offer" className="w-full">
          <Button variant="outline" className="w-full">
            {t("browse_offerings")}
          </Button>
        </Link>
      </div>

      <p className="text-sm text-muted-foreground pt-4">
        {t("have_questions")}{" "}
        <Link href="/support/ticket" className="text-primary hover:underline">
          {t("contact_our_support_team")}
        </Link>
      </p>
    </div>
  );
}
