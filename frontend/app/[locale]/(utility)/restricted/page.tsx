import type { Metadata } from "next";
import RestrictedClient from "./client";

export const metadata: Metadata = {
  title: "Service not available in your region",
  description:
    "Access to this service is restricted in your jurisdiction for regulatory reasons.",
  // A compliance notice has no business being indexed, and search engines
  // crawling from a restricted country would otherwise cache it as the site's
  // content.
  robots: { index: false, follow: false },
};

export default function RestrictedPage() {
  return <RestrictedClient />;
}
