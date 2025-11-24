import { redirect } from "@/i18n/routing";

/**
 * Wallet type page - redirects to main wallet page
 * This page is required for Next.js App Router to properly handle the [currency] dynamic route
 */
export default function WalletTypePage() {
  const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en";
  
  // Redirect to the main wallet page since we don't have a standalone type list
  redirect({ href: "/finance/wallet", locale: defaultLocale });
} 