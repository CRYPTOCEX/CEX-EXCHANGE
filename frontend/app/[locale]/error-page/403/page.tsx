"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

const ErrorPage = () => {
  const t = useTranslations("error-page/403");
  const { theme } = useTheme();
  const lightImage = "/images/error/light-403.png";
  const darkImage = "/images/error/dark-403.png";
  return (
    <div className="min-h-screen overflow-y-auto flex justify-center items-center p-10">
      <div className="w-full flex flex-col items-center">
        <div className="max-w-[542px]">
          <Image
            src={theme === "dark" ? darkImage : lightImage}
            alt="error image"
            width={542}
            height={400}
            className="w-full h-full object-cover"
            priority={true}
            unoptimized={true}
          />
        </div>
        <div className="mt-16 text-center">
          <div className="text-2xl md:text-4xl lg:text-5xl font-semibold text-zinc-900 dark:text-zinc-50">
            {t("ops_access_denied")}
          </div>
          <div className="mt-3 text-sm md:text-base text-zinc-500 dark:text-zinc-400">
            {t("access_to_this_is_forbidden")}
            <br />
            {t("you_dont_have_this_resource")}
          </div>
          <Link href="/dashboard">
            <Button className="mt-9 md:min-w-[300px]" size="lg">
              {t("go_to_homepage")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
