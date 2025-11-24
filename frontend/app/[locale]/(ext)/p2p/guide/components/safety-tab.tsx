import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Shield,
  XCircle,
  Eye,
  Users,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function SafetyTab() {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("trading_safety_tips")}</CardTitle>
        <CardDescription>
          {t("essential_guidelines_to_p2p_platform")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-900">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-medium text-blue-800 dark:text-blue-300">
              {t("our_escrow_protection")}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t("all_trades_on_escrow_system")}.{" "}
            {t("the_cryptocurrency_is_is_complete")}.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">{t("for_buyers")}</p>
                <p className="text-muted-foreground">
                  {t("ensures_the_seller_the_cryptocurrency")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">{t("for_sellers")}</p>
                <p className="text-muted-foreground">
                  {t("protects_your_cryptocurrency_been_received")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("essential_safety_rules")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-primary" />
                <h4 className="font-medium">
                  {t("always_use_platform_escrow")}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("never_agree_to_trade_outside_the_platform")}.{" "}
                {t("our_escrow_system_and_sellers")}.{" "}
                {t("trading_off-platform_removes_to_scams")}.
              </p>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-5 w-5 text-primary" />
                <h4 className="font-medium">
                  {t("verify_payment_before_releasing")}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("sellers_should_always_from_escrow")}.{" "}
                {t("check_your_actual_buyers_screenshot")}.
              </p>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h4 className="font-medium">
                  {t("keep_communication_on-platform")}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("use_only_the_trade_communications")}.{" "}
                {t("this_creates_a_assist_you")}.
              </p>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary" />
                <h4 className="font-medium">{t("check_user_reputation")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("trade_with_users_positive_feedback")}.{" "}
                {t("new_accounts_with_no_history_may_pose_higher_risks")}.{" "}
                {t("verified_users_have_verification_process")}.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t("common_scams_to_avoid")}
          </h3>
          <div className="space-y-3">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{t("fake_payment_confirmations")}</AlertTitle>
              <AlertDescription className="text-sm">
                {t("scammers_may_send_or_emails")}.{" "}
                {t("always_verify_the_releasing_cryptocurrency")}.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{t("off-platform_trading")}</AlertTitle>
              <AlertDescription className="text-sm">
                {t("never_agree_to_better_price")}.{" "}
                {t("youll_lose_escrow_goes_wrong")}.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{t("reversible_payments")}</AlertTitle>
              <AlertDescription className="text-sm">
                {t("be_cautious_with_credit_cards)")}.{" "}
                {t("once_cryptocurrency_is_be_reversed")}.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{t("phishing_attempts")}</AlertTitle>
              <AlertDescription className="text-sm">
                {t("be_wary_of_login_credentials")}.{" "}
                {t("our_platform_will_in_chat")}.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h3 className="font-medium">
              {t("what_to_do_if_you_suspect_a_scam")}
            </h3>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {t("if_you_believe_suspicious_behavior")}
            </p>
            <ol className="space-y-2 pl-5 list-decimal">
              <li>{t("do_not_release_additional_payments")}</li>
              <li>{t("contact_our_support_the_platform")}</li>
              <li>{t("provide_all_relevant_transaction_ids)")}</li>
              <li>{t("do_not_engage_further_with_the_suspected_scammer")}</li>
            </ol>
            <p className="text-muted-foreground mt-2">
              {t("our_support_team_during_trading")}.
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <Link href="/p2p/offer">
            <Button>
              {t("start_trading_safely")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
