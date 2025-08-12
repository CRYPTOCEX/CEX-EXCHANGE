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
  BadgeCheck,
  CheckCircle,
  Lock,
  MessageSquare,
  Eye,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function SellersTab() {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("guide_for_cryptocurrency_sellers")}</CardTitle>
        <CardDescription>{t("learn_how_to_p2p_platform")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {t("step-by-step_selling_process")}
          </h3>
          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  1:
                </div>
                <div>
                  <h4 className="font-medium mb-1">
                    {t("create_a_sell_offer_or_find_a_buyer")}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("you_can_either_buy_offer")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted/50 p-3 rounded-lg border">
                      <h5 className="font-medium mb-1">
                        {t("creating_a_sell_offer")}
                      </h5>
                      <ul className="space-y-1 pl-4">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          <span>{t("specify_cryptocurrency_and_amount")}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          <span>{t("set_your_price_and_payment_methods")}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          <span>
                            {t("define_trade_terms_and_requirements")}
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border">
                      <h5 className="font-medium mb-1">
                        {t("finding_a_buyer")}
                      </h5>
                      <ul className="space-y-1 pl-4">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          <span>{t("browse_existing_buy_offers")}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          <span>{t("check_buyer_reputation_and_terms")}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          <span>
                            {t("accept_offers_that_match_your_needs")}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">
                    {t("deposit_cryptocurrency_to_escrow")}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("when_a_trade_into_escrow")}
                  </p>
                  <ul className="space-y-2 text-sm pl-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("the_platform_will_in_escrow")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("this_protects_both_the_transaction")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {t("funds_remain_secure_until_payment_is_confirmed")}
                      </span>
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
                  <h4 className="font-medium mb-1">
                    {t("provide_payment_instructions")}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("give_clear_payment_instructions_to_the_buyer")}
                  </p>
                  <ul className="space-y-2 text-sm pl-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {t("share_your_payment_link_etc")}. )
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {t("specify_any_reference_numbers_or_notes_to_include")}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {t("provide_any_additional_instructions_needed")}
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
                    {t("verify_payment_and_release_funds")}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("once_the_buyer_has_made_payment")}
                  </p>
                  <ul className="space-y-2 text-sm pl-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>
                        <strong>{t("important")}</strong>
                        {t("verify_the_payment_releasing_funds")}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("check_that_the_match_exactly")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("once_confirmed_release_from_escrow")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t("leave_feedback_for_the_buyer")}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("tips_for_sellers")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>{t("always_verify_payment")}</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {t("check_your_account_releasing_cryptocurrency")}.
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <BadgeCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>{t("check_buyer_reputation")}</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {t("trade_with_buyers_completion_rates")}.
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>{t("use_platform_escrow")}</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {t("never_agree_to_escrow_system")}.
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>{t("provide_clear_instructions")}</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {t("give_detailed_payment_and_delays")}.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <Link href="/p2p/offer/create">
            <Button>
              {t("create_sell_offer")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
