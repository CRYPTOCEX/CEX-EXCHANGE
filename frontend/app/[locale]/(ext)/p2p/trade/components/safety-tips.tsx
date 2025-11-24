import { Link } from "@/i18n/routing";
import { Shield } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function SafetyTips() {
  const t = useTranslations("ext");
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-primary" />
          {t("trading_safety_tips")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("verify_payment_first")}</h4>
            <p className="text-xs text-muted-foreground">
              {t("always_verify_that_from_escrow")}.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {t("use_platform_chat_only")}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("keep_all_communication_dispute_resolution")}.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {t("check_trader_reputation")}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("trade_with_users_positive_feedback")}.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href="/p2p/guide" className="w-full">
          <Button variant="outline" size="sm">
            {t("view_safety_guide")}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
