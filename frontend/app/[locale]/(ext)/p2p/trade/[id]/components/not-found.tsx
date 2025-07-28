import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function NotFound() {
  const t = useTranslations("ext");
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold">{t("trade_not_found")}</h1>
          <p className="text-muted-foreground">
            {t("the_trade_youre_view_it")}.
          </p>
          <div className="pt-4">
            <Link href="/p2p/trade">
              <Button>{t("return_to_trades")}</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NotFound;
