import type { Metadata } from "next";
import AboutPageClient from "./client";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Initial Token Offering Platform";

export const metadata: Metadata = {
  title: `About ${siteName}`,
  description: siteDescription,
};

export default function AboutPage() {
  return <AboutPageClient />;
}
