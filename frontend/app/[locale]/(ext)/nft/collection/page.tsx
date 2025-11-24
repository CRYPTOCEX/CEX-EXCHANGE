import { redirect } from "@/i18n/routing";

/**
 * NFT collection page - redirects to creator page with collections tab
 * This page is required for Next.js App Router to properly handle the [id] dynamic route
 */
export default function NFTCollectionPage() {
  const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en";

  // Redirect to the creator page with collections tab
  redirect({ href: "/nft/creator?tab=collections", locale: defaultLocale });
} 