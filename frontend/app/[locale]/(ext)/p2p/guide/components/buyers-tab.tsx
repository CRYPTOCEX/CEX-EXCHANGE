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
  CheckCircle,
  Clock,
  FileText,
  Info,
  MessageSquare,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function BuyersTab() {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("guide_for_cryptocurrency_buyers")}</CardTitle>
        <CardDescription>{t("learn_how_to_p2p_platform")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {t("step-by-step_buying_process")}
          </h3>
          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  1:
                </div>
                <div>
                  <h4 className="font-medium mb-1">{t("find_a_seller")}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("browse_sell_offers_based_on")}
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pl-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("cryptocurrency_type_and_amount")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("payment_methods_you_prefer")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("price_and_exchange_rate")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("seller_reputation_and_completion_rate")}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">{t("start_the_trade")}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("once_youve_found_the_trade")}
                  </p>
                  <ul className="space-y-2 text-sm pl-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("click_buy_now_on_the_sellers_offer")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("confirm_the_trade_payment_method)")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("the_sellers_cryptocurrency_in_escrow")}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">{t("make_payment")}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("send_payment_to_payment_method")}
                  </p>
                  <ul className="space-y-2 text-sm pl-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {t("follow_the_sellers_payment_instructions_carefully")}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("include_any_required_reference_numbers")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("keep_proof_of_transaction_ids)")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {t("click_ive_paid_once_payment_is_complete")}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium mb-1">
                    {t("receive_cryptocurrency")}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("once_the_seller_confirms_your_payment")}
                  </p>
                  <ul className="space-y-2 text-sm pl-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("the_cryptocurrency_will_your_wallet")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {t("youll_receive_a_confirmation_notification")}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("leave_feedback_for_the_community")}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("tips_for_buyers")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>{t("verify_seller_reputation")}</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {t("check_the_sellers_before_trading")}.
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>{t("pay_within_time_limit")}</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {t("complete_payment_within_trade_cancellation")}.
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>{t("communicate_clearly")}</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {t("use_the_platform_any_issues")}.
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>{t("keep_payment_proof")}</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {t("save_screenshots_and_your_payment")}.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <Link href="/p2p/offer">
            <Button>
              {t("browse_buy_offers")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
