import type { Metadata } from "next";
import ContentReportClient from "./client";

export const metadata: Metadata = {
  title: "Reported Content | Admin Dashboard",
  description: "Complaints users filed about comments, posts and listings",
};

export default function ContentReportPage() {
  return <ContentReportClient />;
}
