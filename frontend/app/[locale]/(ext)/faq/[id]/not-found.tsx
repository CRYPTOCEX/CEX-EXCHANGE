import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function FaqNotFound() {
  const t = useTranslations("ext");
  return (
    <div className="container flex items-center justify-center min-h-[70vh]">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{t("faq_not_found")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t("the_faq_youre_been_moved")}. {t("please_check_the_looking_for")}
            .
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href="/faq">
            <Button variant="outline">{t("browse_all_faqs")}</Button>
          </Link>
          <Link href="/">
            <Button>{t("return_home")}</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
