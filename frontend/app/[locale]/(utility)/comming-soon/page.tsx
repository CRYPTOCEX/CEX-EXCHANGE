"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import NavbarLogo from "@/components/elements/navbar-logo";

const CommingSoonPage = () => {
  const t = useTranslations("utility");
  const { theme } = useTheme();
  const LightImage = "/images/utility/comming-soon-light.png";
  const DarkImage = "/images/utility/comming-soon-dark.png";
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
        <div className="container">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-5">
            <div className="lg:max-w-[570px]">
              <div className="text-2xl font-medium text-zinc-900 dark:text-zinc-50">
                {t("coming_soon")}
              </div>
              <div className="mt-4 text-5xl 2xl:text-7xl font-semibold text-zinc-900 dark:text-zinc-50">
                {t("get_notified_when_we_launch")}
              </div>
              <div className="mt-6 text-sm xl:text-base text-zinc-500 dark:text-zinc-400">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
              </div>
              <div className="relative mt-5 lg:mt-12">
                <Input
                  type="text"
                  placeholder="Enter your email"
                  className="h-12 lg:h-16 placeholder:text-base"
                />
                <Button className="absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 h-8 lg:h-11">
                  {t("notify_me")}
                </Button>
              </div>
              <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                {t("*dont_worry_we_will_not_spam_you_)")}
              </div>
            </div>
            <div className="mt-10 lg:mt-0 xl:pl-32">
              <Image
                src={theme === "dark" ? DarkImage : LightImage}
                alt="comming soon"
                width={600}
                height={400}
                className="w-full h-full object-cover"
                priority={true}
                unoptimized={true}
              />
            </div>
          </div>
        </div>
      </div>
      {/* footer */}
      <div className="flex-none flex flex-col sm:flex-row flex-wrap gap-4 p-10">
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
