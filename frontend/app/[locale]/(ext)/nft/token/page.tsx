import { redirect } from "@/i18n/server-routing";

/**
 * NFT token page - redirects to the main NFT page
 * This page exists so the App Router resolves the sibling [id] dynamic route.
 *
 * The redirect MUST come from `@/i18n/server-routing`. `@/i18n/routing` is a
 * "use client" module, and calling its redirect while rendering this server
 * component threw — every one of these three pages answered HTTP 500 instead of
 * redirecting. The server helper also requires the locale, so the visitor keeps
 * the language they were browsing in.
 */
export default async function NFTTokenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect("/nft", locale);
}
