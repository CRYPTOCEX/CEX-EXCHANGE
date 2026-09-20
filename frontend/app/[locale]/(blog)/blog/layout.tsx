"use client";

import type React from "react";
import { useEffect } from "react";
import BlogNav from "./components/blog-nav";
import { SiteFooter } from "@/components/partials/footer/user-footer";
import { usePathname } from "@/i18n/routing";
import { useSidebar } from "@/store";

/**
 * Routes that own the whole viewport and render no site chrome.
 *
 * The post editor is a writing surface, not a page in the blog: it renders its
 * own top bar and the nav/footer here would only compete with it. This mirrors
 * the same list in `(blog)/admin/layout.tsx` — the two editors are one
 * component and must not disagree about their frame.
 *
 * `usePathname` is the re-export from `@/i18n/routing`, which strips the locale
 * prefix (`/en/blog/author/manage/new` -> `/blog/author/manage/new`). Anchored
 * at both ends so `/blog/author/manage` (the list) keeps its chrome.
 */
const CHROMELESS = [
  /^\/blog\/author\/manage\/new$/,
  /^\/blog\/author\/manage\/[^/]+\/edit$/,
];

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const setMobileMenu = useSidebar((s) => s.setMobileMenu);
  const chromeless = CHROMELESS.some((p) => p.test(pathname));

  /**
   * `mobileMenu` is persisted to localStorage, and the only thing that clears
   * it is a route-change effect inside `MobileMenu` — which this branch does
   * not render. Navigating into the editor with the drawer open therefore
   * leaves `true` on disk, and the next chrome-bearing page paints one frame
   * with the drawer open before its own effect closes it.
   */
  useEffect(() => {
    if (chromeless) setMobileMenu(false);
  }, [chromeless, setMobileMenu]);

  if (chromeless) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-card flex flex-col">
      <BlogNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
