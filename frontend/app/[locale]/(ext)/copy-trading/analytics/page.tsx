import type { Metadata } from "next";
import AnalyticsClient from "./client";

export const metadata: Metadata = {
  title: "Analytics | Copy Trading",
  description: "View your copy trading performance analytics",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
