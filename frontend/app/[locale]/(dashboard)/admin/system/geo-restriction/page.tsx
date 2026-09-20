import type { Metadata } from "next";
import GeoRestrictionClient from "./client";

export const metadata: Metadata = {
  title: "Geographic Restrictions - Admin Dashboard",
  description:
    "Restrict platform access by country, with a full audit trail of every decision.",
};

export default function GeoRestrictionPage() {
  return <GeoRestrictionClient />;
}
