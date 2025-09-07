"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

const ErrorPage = () => {
  const t = useTranslations("error-page/503");
  const { theme } = useTheme();
  const lightImage = "/images/error/light-503.png";
  const darkImage = "/images/error/dark-503.png";
  return (
    <div className="min-h-screen overflow-y-auto flex justify-center items-center p-10">
      <div className="flex flex-col items-center">
        <div className="max-w-[430px]">
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
          <div className="text-xl md:text-4xl lg:text-5xl font-semibold text-zinc-900 dark:text-zinc-50">
            {t("ops_service_unavailable_error")}
          </div>
          <div className="mt-3 text-sm md:text-base text-zinc-500 dark:text-zinc-400">
            {t("our_service_is_back_soon")}
            <br />
            {t("please_check_back_for_updates")}
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
