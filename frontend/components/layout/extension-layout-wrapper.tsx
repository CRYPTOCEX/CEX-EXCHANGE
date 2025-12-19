"use client";

import { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import { SiteFooter } from "@/components/partials/footer/user-footer";
import Footer from "@/components/partials/footer";

interface ExtensionLayoutWrapperProps {
  children: ReactNode;
  /** The landing page path for this extension (e.g., "/staking", "/affiliate") */
  landingPath: string;
  /** Whether to show the regular footer on non-landing pages (default: true) */
  showFooterOnSubpages?: boolean;
  /** Custom class name for the main element */
  mainClassName?: string;
  /** Custom footer component to use on subpages instead of the default Footer */
  customSubpageFooter?: ReactNode;
}

/**
 * Wrapper component for extension layouts that conditionally shows:
 * - SiteFooter on the landing page
 * - Regular Footer (or custom footer) on subpages (optional)
 */
export function ExtensionLayoutWrapper({
  children,
  landingPath,
  showFooterOnSubpages = true,
  mainClassName = "flex-1",
  customSubpageFooter,
}: ExtensionLayoutWrapperProps) {
  const pathname = usePathname();

  // Check if current path matches the landing page
  // We need to handle both exact match and locale prefix
  const isLandingPage =
    pathname === landingPath ||
    pathname.endsWith(landingPath) ||
    // Handle trailing slash
    pathname === `${landingPath}/` ||
    pathname.endsWith(`${landingPath}/`);

  return (
    <>
      <main className={mainClassName}>{children}</main>
      {isLandingPage ? (
        <SiteFooter />
      ) : (
        showFooterOnSubpages && (customSubpageFooter ?? <Footer />)
      )}
    </>
  );
}
