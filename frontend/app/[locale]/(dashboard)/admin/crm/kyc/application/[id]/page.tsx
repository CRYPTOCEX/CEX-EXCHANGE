import type { Metadata } from "next";
import ApplicationDetailClient from "./client";

export const metadata: Metadata = {
  title: "KYC Application Details",
  description: "Review and manage KYC application",
};

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ApplicationDetailClient params={params} />;
}
