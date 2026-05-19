import type { Metadata } from "next";
import TokenPageClient from "./client";

export const metadata: Metadata = {
  title: "Token Details | Creator Dashboard",
  description: "View and manage your token details.",
};

export default function TokenPage() {
  return <TokenPageClient />;
}
