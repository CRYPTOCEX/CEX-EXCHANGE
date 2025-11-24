import type React from "react";
import BlogNav from "./components/blog-nav";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen dark:bg-black">
      <BlogNav />
      <main className="pt-14 md:pt-18">{children}</main>
    </div>
  );
}
