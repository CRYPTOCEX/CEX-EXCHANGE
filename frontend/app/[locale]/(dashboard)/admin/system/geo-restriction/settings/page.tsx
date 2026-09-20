import type { Metadata } from "next";
import GeoRestrictionSettingsClient from "./client";

export const metadata: Metadata = {
  title: "Geographic Restriction Policy - Admin Dashboard",
  description:
    "Configure how geographic access restrictions are enforced, how visitor countries are determined, and what is recorded.",
};

export default function GeoRestrictionSettingsPage() {
  return <GeoRestrictionSettingsClient />;
}
