"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const ErrorBlock = () => {
  const t = useTranslations("components/error-block");
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const lightImage = "/images/error/light-404.png";
  const darkImage = "/images/error/dark-404.png";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only decide the image after the client has mounted to ensure SSR/CSR match.
  const imageSrc = mounted && theme === "dark" ? darkImage : lightImage;

  return (
    <div className="min-h-screen overflow-y-auto flex justify-center items-center p-10">
      <div className="w-full flex flex-col items-center">
        <div className="max-w-[740px]">
          <Image
            src={imageSrc}
            alt="error image"
            width={740}
            height={400}
            className="w-full h-full object-cover"
            unoptimized={true}
          />
        </div>
        <div className="mt-16 text-center">
          <div className="text-2xl md:text-4xl lg:text-5xl font-semibold text-foreground">
            {t("ops_page_not_found")}
          </div>
          <div className="mt-3 text-muted-foreground text-sm md:text-base">
            {t("the_page_you_removed_had")}
            <br />
            {t("its_name_changed_or_is_temporarily_unavailable")}.
          </div>
          <Link href="/">
            <Button className="mt-9 md:min-w-[300px]" size="lg">
              {t("go_to_homepage")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorBlock;
