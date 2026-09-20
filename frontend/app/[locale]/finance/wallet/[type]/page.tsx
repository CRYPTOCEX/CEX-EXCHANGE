import { redirect } from "@/i18n/server-routing";

/**
 * Wallet type page - redirects to main wallet page
 * This page is required for Next.js App Router to properly handle the [currency] dynamic route
 */
export default async function WalletTypePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  /* Redirect to the main wallet page since we don't have a standalone type
     list. Locale-prefixed: a bare `/finance/wallet` drops a non-default locale
     on the way through the locale rewrite. */
  const { locale } = await params;
  redirect("/finance/wallet", locale);
}
