import { redirect } from "@/i18n/routing";

/**
 * NFT user page - redirects to main NFT page
 * This page is required for Next.js App Router to properly handle the [id] dynamic route
 */
export default function NFTUserPage() {
  const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en";
  
  // Redirect to the main NFT page since we don't have a standalone user list
  redirect({ href: "/nft", locale: defaultLocale });
} 