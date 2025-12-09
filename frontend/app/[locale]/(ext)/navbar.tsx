"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import ThemeButton from "@/components/partials/header/theme-button";
import Language from "@/components/partials/header/language";
import ProfileInfo from "@/components/partials/header/profile-info";
import NavbarLogo from "@/components/elements/navbar-logo";
import { Menu, ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/store/user";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  key?: string; // Translation key
  exact?: boolean;
  children?: NavItem[];
}

export interface ExtNavbarProps {
  navItems: NavItem[];
  showTools?: boolean;
  isAdmin?: boolean;
  backHref?: string; // Link for back button (shows chevron if provided)
  rightSlot?: React.ReactNode; // Custom slot for right side of navbar (before tools)
}

export function ExtNavbar({
  navItems,
  showTools = true,
  isAdmin = false,
  backHref,
  rightSlot,
}: ExtNavbarProps) {
  const t = useTranslations("ext");
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const { user } = useUserStore();

  // Close mobile menu on navigation or when switching to desktop
  useEffect(() => {
    if (isDesktop) {
      setIsOpen(false);
    }
  }, [pathname, isDesktop]);

  // Get translated title for nav item
  const getTitle = (item: NavItem): string => {
    if (!item.key) {
      return item.title;
    }
    try {
      const translated = t(item.key);
      // If translation exists and is not the key itself, use it
      return translated && translated !== item.key ? translated : item.title;
    } catch {
      return item.title;
    }
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => {
      const isActive = item.exact
        ? pathname === item.href
        : pathname.startsWith(item.href);
      const Icon = item.icon;
      const title = getTitle(item);
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
            <span>{title}</span>
          </div>
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {backHref && (
              <Link
                href={backHref}
                className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </Link>
            )}
            <NavbarLogo isInAdmin={isAdmin} />
          </div>
          {isDesktop && (
            <nav className="flex items-center">{renderNavItems(navItems)}</nav>
          )}
        </div>
        {showTools && (
          <div className="flex items-center gap-4">
            {rightSlot}
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
                <SheetContent
                  side="left"
                  className="w-[80%] sm:w-[350px] flex flex-col p-0"
                >
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Main navigation menu
                  </SheetDescription>

                  {/* Header with Logo */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <NavbarLogo isInAdmin={isAdmin} />
                  </div>

                  {/* Navigation Items */}
                  <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
                    {renderNavItems(navItems)}
                  </nav>

                  {/* Footer with User Profile */}
                  <div className="mt-auto border-t p-4">
                    <div className="flex items-center justify-between">
                      {/* User Info - Left Side */}
                      <Link
                        href="/user/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                          <AvatarImage
                            src={user?.avatar || "/img/avatars/placeholder.webp"}
                            alt={user ? `${user.firstName} ${user.lastName}` : "User"}
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {user
                              ? `${user.firstName} ${user.lastName}`
                              : "Guest User"}
                          </span>
                          {user?.email && (
                            <span className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Actions - Right Side */}
                      <div className="flex items-center gap-1">
                        <Language />
                        <ThemeButton />
                      </div>
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
