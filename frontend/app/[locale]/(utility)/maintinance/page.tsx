"use client";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import NavbarLogo from "@/components/elements/navbar-logo";

const CommingSoonPage = () => {
  const t = useTranslations("utility");
  const { theme } = useTheme();
  const LightImage = "/images/utility/construction-light.png";
  const DarkImage = "/images/utility/construction-dark.png";
  const socials = [
    { link: "/", icon: <Twitter /> },
    { link: "/", icon: <Facebook /> },
    { link: "/", icon: <Linkedin /> },
    { link: "/", icon: <Instagram /> },
  ];
  const menu = [
    { label: "Privacy Policy", link: "/" },
    { label: "FAQ", link: "/" },
    { label: "Email Us", link: "/" },
  ];
  return (
    <div className="flex flex-col min-h-screen">
      {/* header */}
      <div className="flex-none p-10 flex flex-wrap justify-between gap-4">
        <NavbarLogo href="/" />
        <Link href="/dashboard">
          <Button variant="outline" size="lg">
            {t("contact_us")}
          </Button>
        </Link>
      </div>
      {/* main */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="container flex flex-col items-center">
          <div className="w-full h-full lg:w-[700px] lg:h-[432px]">
            <Image
              src={theme === "dark" ? DarkImage : LightImage}
              alt="construction"
              width={700}
              height={432}
              className="h-full w-full object-cover"
              unoptimized={true}
            />
          </div>
          <div className="mt-12 lg:mt-20 text-xl md:text-3xl lg:text-5xl font-semibold text-zinc-900 dark:text-zinc-50 text-center">
            {t("we_are_under_maintenance")}
          </div>
          <div className="text-sm md:text-base lg:text-xl text-zinc-500 dark:text-zinc-400 mt-4 text-center">
            {t("were_making_the_system_more_awesome")}
            <br />
            {t("well_be_back_shortly")}
          </div>
        </div>
      </div>
      {/* footer */}
      <div className="flex-none flex flex-col items-center sm:flex-row flex-wrap gap-4 p-10">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {socials.map((item, index) => (
            <Link key={`social-icon-${index}`} href={item.link}>
              <Button size="icon" variant="outline" className="rounded-full">
                {item.icon}
              </Button>
            </Link>
          ))}
        </div>
        <ul className="flex-none flex flex-wrap gap-6">
          {menu.map((item, index) => (
            <li key={`nav-item-${index}`}>
              <Link
                href={item.link}
                className="text-base font-medium text-zinc-500 dark:text-zinc-400 hover:text-primary"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CommingSoonPage;
