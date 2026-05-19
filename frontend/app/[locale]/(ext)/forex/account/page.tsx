import { redirect } from "@/i18n/routing";

/**
 * Forex account page - redirects to main forex page
 * This page is required for Next.js App Router to properly handle the [id] dynamic route
 */
export default function ForexAccountPage() {
  // Redirect to the main forex page since we don't have a standalone account list
  redirect("/forex");
} 