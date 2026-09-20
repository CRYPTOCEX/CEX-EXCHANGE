import type { Metadata } from "next";
import ApplicationsClient from "./client";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "KYC Applications Management",
  description: "Manage and review KYC applications",
};

export default function ApplicationsPage() {
  return (
    <PageShell rhythm="none">
      <ApplicationsClient />
    </PageShell>
  );
}
