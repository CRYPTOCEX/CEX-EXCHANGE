import type { Metadata } from "next";
import ApplicationsClient from "./client";
export const metadata: Metadata = {
  title: "KYC Applications Management",
  description: "Manage and review KYC applications",
};
export default function ApplicationsPage() {
  return <ApplicationsClient />;
}
