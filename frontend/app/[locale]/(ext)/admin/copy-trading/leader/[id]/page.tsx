import type { Metadata } from "next";
import LeaderDetailClient from "./client";

export const metadata: Metadata = {
  title: "Leader Details | Copy Trading Admin",
  description: "View and manage leader details",
};

export default function LeaderDetailPage() {
  return <LeaderDetailClient />;
}
