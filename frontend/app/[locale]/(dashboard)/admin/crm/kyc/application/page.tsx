import type { Metadata } from "next";
import ApplicationsClient from "./client";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export const metadata: Metadata = {
  title: "KYC Applications Management",
  description: "Manage and review KYC applications",
};

export default function ApplicationsPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <ApplicationsClient />
    </div>
  );
}
