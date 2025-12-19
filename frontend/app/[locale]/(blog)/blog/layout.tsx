"use client";

import type React from "react";
import BlogNav from "./components/blog-nav";
import { SiteFooter } from "@/components/partials/footer/user-footer";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <BlogNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
