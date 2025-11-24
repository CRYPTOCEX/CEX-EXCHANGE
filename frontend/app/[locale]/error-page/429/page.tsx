"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

const ErrorPage = () => {
  const t = useTranslations("error-page/429");
  const { theme } = useTheme();
  const lightImage = "/images/error/light-429.png";
  const darkImage = "/images/error/dark-429.png";
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
            {t("ops_too_many_request_error")}
          </div>
          <div className="mt-3 text-sm md:text-base text-zinc-500 dark:text-zinc-400">
            {t("you_have_made_please_wait")}
            <br />
            {t("and_try_again_later")}
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
