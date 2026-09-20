import { redirect } from "@/i18n/server-routing";

/**
 * Forex account page - redirects to main forex page
 * This page is required for Next.js App Router to properly handle the [id] dynamic route
 *
 * The redirect MUST come from `@/i18n/server-routing`. `@/i18n/routing` is a
 * "use client" module, so importing its redirect here yielded a client-reference
 * proxy that threw as soon as this server component rendered. The server helper
 * also takes the locale, so the visitor keeps the language they were browsing in.
 */
export default async function ForexAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Redirect to the main forex page since we don't have a standalone account list
  redirect("/forex", locale);
}
