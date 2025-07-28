"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";

const blogAdminMenu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/admin/blog",
    icon: "lucide:layout-dashboard",
  },
  {
    key: "posts",
    title: "Posts",
    href: "/admin/blog/post",
    icon: "lucide:file-text",
  },
  {
    key: "authors",
    title: "Authors",
    href: "/admin/blog/author",
    icon: "lucide:users",
  },
  {
    key: "categories",
    title: "Categories",
    href: "/admin/blog/category",
    icon: "lucide:folder-open",
  },
  {
    key: "tags",
    title: "Tags",
    href: "/admin/blog/tag",
    icon: "lucide:tag",
  },
  {
    key: "comments",
    title: "Comments",
    href: "/admin/blog/comment",
    icon: "lucide:message-circle",
  },
  {
    key: "settings",
    title: "Settings",
    href: "/admin/blog/settings",
    icon: "lucide:settings",
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader title="Blog" menu={blogAdminMenu} />
      <main className="flex-1 mx-auto container space-y-8 py-30">
        {children}
      </main>
      <Footer />
    </>
  );
}
