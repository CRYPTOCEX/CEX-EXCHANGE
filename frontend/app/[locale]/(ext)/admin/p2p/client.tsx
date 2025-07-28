"use client";

import type React from "react";

import {
  LayoutDashboard,
  Users,
  Repeat,
  Tag,
  Settings,
  Shield,
  Bell,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import ThemeButton from "@/components/partials/header/theme-button";
import { useTranslations } from "next-intl";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutProps) {
  const t = useTranslations("ext");
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-16 items-center px-6">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5" />
            <span>{t("p2p_admin")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeButton />
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="h-8" />
            <Link href="/p2p">
              <Button variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                {t("exit_admin")}
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-64 border-r bg-muted/40 lg:block">
          <ScrollArea className="h-[calc(100vh-64px)]">
            <div className="flex flex-col gap-1 p-4">
              <h3 className="px-4 py-2 text-sm font-medium text-muted-foreground">
                {t("Dashboard")}
              </h3>
              <AdminNavLink
                href="/admin/p2p"
                icon={<LayoutDashboard className="mr-2 h-4 w-4" />}
              >
                {t("Overview")}
              </AdminNavLink>

              <h3 className="mt-4 px-4 py-2 text-sm font-medium text-muted-foreground">
                {t("Management")}
              </h3>
              <AdminNavLink
                href="/admin/p2p/trade"
                icon={<Repeat className="mr-2 h-4 w-4" />}
              >
                {t("Trades")}
              </AdminNavLink>
              <AdminNavLink
                href="/admin/p2p/offer"
                icon={<Tag className="mr-2 h-4 w-4" />}
              >
                {t("Offers")}
              </AdminNavLink>
              <AdminNavLink
                href="/admin/p2p/dispute"
                icon={<Shield className="mr-2 h-4 w-4" />}
              >
                {t("Disputes")}
              </AdminNavLink>

              <h3 className="mt-4 px-4 py-2 text-sm font-medium text-muted-foreground">
                {t("Settings")}
              </h3>
              <AdminNavLink
                href="/admin/p2p/settings"
                icon={<Settings className="mr-2 h-4 w-4" />}
              >
                {t("platform_settings")}
              </AdminNavLink>
            </div>
          </ScrollArea>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="container p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

interface AdminNavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function AdminNavLink({ href, icon, children }: AdminNavLinkProps) {
  return (
    <Link
      href={href}
      className={cn("w-full justify-start", href === "/admin" && "bg-muted")}
    >
      <Button variant="ghost">
        {icon}
        {children}
      </Button>
    </Link>
  );
}
