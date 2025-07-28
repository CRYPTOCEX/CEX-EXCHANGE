import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("ext");
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] px-4 md:px-6 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        {t("404_-_not_found")}
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        {t("the_staking_resource_been_moved")}
      </p>
      <Link href="/staking">
        <Button>{t("return_to_staking_home")}</Button>
      </Link>
    </div>
  );
}
