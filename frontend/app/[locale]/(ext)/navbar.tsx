"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import ThemeButton from "@/components/partials/header/theme-button";
import Language from "@/components/partials/header/language";
import ProfileInfo from "@/components/partials/header/profile-info";
import NavbarLogo from "@/components/elements/navbar-logo";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  children?: NavItem[];
}

export interface ExtNavbarProps {
  navItems: NavItem[];
  showTools?: boolean;
  isAdmin?: boolean;
}

export function ExtNavbar({
  navItems,
  showTools = true,
  isAdmin = false,
}: ExtNavbarProps) {
  const t = useTranslations("ext");
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1280px)");

  // Close mobile menu on navigation or when switching to desktop
  useEffect(() => {
    if (isDesktop) {
      setIsOpen(false);
    }
  }, [pathname, isDesktop]);

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => {
      const isActive = item.exact
        ? pathname === item.href
        : pathname.startsWith(item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`text-sm font-medium transition-colors hover:text-primary ${
            isActive ? "text-primary" : "text-foreground/60"
          }`}
          onClick={() => setIsOpen(false)}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-md">
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </div>
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <NavbarLogo isInAdmin={isAdmin} />
          {isDesktop && (
            <nav className="flex items-center">{renderNavItems(navItems)}</nav>
          )}
        </div>
        {showTools && (
          <div className="flex items-center gap-2">
            {isDesktop ? (
              <div className="flex items-center gap-2">
                <Language />
                <ThemeButton />
                <ProfileInfo />
              </div>
            ) : (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Toggle menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[80%] sm:w-[350px]">
                  <div className="flex flex-col gap-6 pt-6">
                    <div className="flex items-center justify-between px-4">
                      <NavbarLogo isInAdmin={isAdmin} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close menu"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <nav className="flex flex-col gap-2 px-4">
                      {renderNavItems(navItems)}
                    </nav>
                    <div className="flex items-center gap-2 px-4">
                      <Language />
                      <ThemeButton />
                      <ProfileInfo />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
