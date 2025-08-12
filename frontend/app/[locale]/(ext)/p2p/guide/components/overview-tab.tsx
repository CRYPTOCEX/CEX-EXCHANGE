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
import {
  ArrowRight,
  CheckCircle,
  DollarSign,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function OverviewTab() {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("what_is_p2p_trading")}</CardTitle>
        <CardDescription>
          {t("peer-to-peer_trading_allows_other_users")}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t("how_it_works")}</h3>
            <p className="text-muted-foreground">
              {t("our_p2p_platform_safe_transactions")}.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  {t("browse_offers_from_other_users_or_create_your_own")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t("cryptocurrency_is_held_during_trades")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t("communicate_with_your_platform_chat")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  {t("complete_payment_and_receive_your_cryptocurrency")}
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              {t("benefits_of_p2p_trading")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">
                    {t("multiple_payment_options")}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("choose_from_various_for_you")}
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">{t("secure_escrow")}</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("trade_with_confidence_knowing_funds_are_protected")}
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">{t("competitive_pricing")}</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("often_better_rates_than_traditional_exchanges")}
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">{t("global_community")}</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("connect_with_traders_worldwide")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("getting_started")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 p-4 rounded-lg border relative">
              <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                1:
              </div>
              <div className="pt-2 pl-2">
                <h4 className="font-medium mb-2">{t("create_your_account")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("sign_up_and_complete_verification_to_start_trading")}
                </p>
              </div>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg border relative">
              <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                2
              </div>
              <div className="pt-2 pl-2">
                <h4 className="font-medium mb-2">{t("browse_offers")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("find_offers_that_match_your_trading_preferences")}
                </p>
              </div>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg border relative">
              <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                3
              </div>
              <div className="pt-2 pl-2">
                <h4 className="font-medium mb-2">
                  {t("complete_your_first_trade")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("follow_the_guided_trade_safely")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <Link href="/p2p/offer">
            <Button>
              {t("start_trading_now")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
