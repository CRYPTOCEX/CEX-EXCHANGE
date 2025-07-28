import type { Metadata } from "next";
import { FAQAnalyticsDashboard } from "./client";
export const metadata: Metadata = {
  title: "FAQ Analytics",
  description: "View analytics and insights about your FAQ system",
};
export default function AdminFaqAnalyticsPage() {
  return <FAQAnalyticsDashboard />;
}
