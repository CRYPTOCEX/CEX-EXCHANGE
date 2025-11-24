"use client";

import { usePathname } from "@/i18n/routing";
import Footer from "@/components/partials/footer";
import NFTAdminNavbar from "./components/navbar";

export default function NFTAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActivityPage = pathname.endsWith('/activity');

  // Skip layout for activity page
  if (isActivityPage) {
    return <>{children}</>;
  }

  return (
    <>
      <NFTAdminNavbar />
      <main className="flex-1 mx-auto container pt-8 space-y-8 pb-24">
        {children}
      </main>
      <Footer />
    </>
  );
} 