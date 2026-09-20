"use client";

import { useEffect, type ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { usePathname } from "@/i18n/routing";
import { useSidebar } from "@/store";

/**
 * Blog admin nav — four entries, not seven.
 *
 * Every destination was top-level, so the bar carried Dashboard, Posts,
 * Authors, Categories, Tags, Comments and Settings side by side. That is more
 * items than any other admin section here puts in one row, and it read as a
 * list rather than as a structure: nothing told you that Categories and Tags
 * are both ways of filing a Post, or that Authors and Comments are both people.
 *
 * The two groups say that. A group carries no `href` — `SiteHeader` opens it as
 * a dropdown, and `mobile-menu.tsx` treats `child && !href` as a collapsible
 * section, so the same shape works on both.
 *
 * `key` is the translation path, not `title`: this is a call-site menu, so the
 * namespace is the default `menu` with no `nav.` prefix and dashes become dots
 * (`blog-content` -> `menu.blog.content.title`). `title` is only the fallback
 * used when the key is missing. The seven leaf keys already resolve; the two
 * group keys are new. `dashboard` is special-cased for exact matching in
 * `isActiveMenu`, so it does not light up on every child route.
 */
const blogAdminMenu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/admin/blog",
    icon: "lucide:layout-dashboard",
  },
  {
    key: "blog-content",
    title: "Content",
    description: "Posts and the taxonomy used to file them.",
    icon: "lucide:file-text",
    child: [
      {
        key: "posts",
        title: "Posts",
        description: "Write, edit and publish articles.",
        href: "/admin/blog/post",
        icon: "lucide:newspaper",
      },
      {
        key: "categories",
        title: "Categories",
        description: "The single subject each post belongs to.",
        href: "/admin/blog/category",
        icon: "lucide:folder-open",
      },
      {
        key: "tags",
        title: "Tags",
        description: "Cross-cutting labels a post can carry several of.",
        href: "/admin/blog/tag",
        icon: "lucide:tag",
      },
    ],
  },
  {
    key: "blog-community",
    title: "Community",
    description: "The people who write for the blog and the readers who reply.",
    icon: "lucide:users",
    child: [
      {
        key: "authors",
        title: "Authors",
        description: "Approve author applications and manage profiles.",
        href: "/admin/blog/author",
        icon: "lucide:pen-line",
      },
      {
        key: "comments",
        title: "Comments",
        description: "Moderate reader replies.",
        href: "/admin/blog/comment",
        icon: "lucide:message-circle",
      },
    ],
  },
  {
    key: "settings",
    title: "Settings",
    href: "/admin/blog/settings",
    icon: "lucide:settings",
  },
];

/**
 * Routes that own the whole viewport and render no site chrome.
 *
 * `usePathname` here is the re-export from `@/i18n/routing`, which strips the
 * locale prefix (`/en/admin/blog/post/create` -> `/admin/blog/post/create`), so
 * these patterns are anchored and cannot be defeated by the locale segment.
 *
 * They are anchored at BOTH ends on purpose: `/admin/blog/post` (the list) and
 * `/admin/blog/post/create/anything` must keep their nav. A `startsWith` here
 * would have taken the chrome off the list page too.
 */
const CHROMELESS = [
  /**
   * `/admin/blog/settings` WAS listed here and did not belong. It renders
   * `SettingsPage`, which is a form with a category rail — not an editor that
   * owns the viewport — and it draws no top bar of its own, only a back
   * chevron, so an operator in blog settings had no route to Posts, Authors or
   * Comments except the browser Back button.
   *
   * Hiding the header also created a gap rather than removing one:
   * `SettingsPage`'s root carries `pt-header`, the clearance for the
   * `fixed top-0` bar, so with no bar rendered it reserved ~64px of empty page
   * above the title. See `components/admin/settings/layout.ts`.
   */
  /^\/admin\/blog\/post\/create$/,
  /^\/admin\/blog\/post\/[^/]+\/edit$/,
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const setMobileMenu = useSidebar((s) => s.setMobileMenu);
  const chromeless = CHROMELESS.some((p) => p.test(pathname));

  /**
   * `mobileMenu` is persisted to localStorage, and the only thing that clears
   * it is a route-change effect inside `MobileMenu` — which this branch does
   * not render. Navigating in with the drawer open therefore leaves `true` on
   * disk, and the next chrome-bearing page paints one frame with the drawer
   * open before its own effect closes it.
   */
  useEffect(() => {
    if (chromeless) setMobileMenu(false);
  }, [chromeless, setMobileMenu]);

  // Full-screen, chrome-free: the post editor renders its own top bar and owns
  // the viewport.
  if (chromeless) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader menu={blogAdminMenu} />
      {/* Was `flex-1 mx-auto space-y-8`. The `mx-auto` fought the child's own
          `container mx-auto`, and the `space-y-8` duplicated the rhythm the
          child already sets — this was the only admin layout carrying one.
          Layouts own the flex slot; pages own width, padding and rhythm. */}
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
