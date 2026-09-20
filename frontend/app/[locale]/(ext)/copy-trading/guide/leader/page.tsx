import type { Metadata } from "next";
import LeaderGuidePage from "./client";

export const metadata: Metadata = {
  title: "Leader Guide | Copy Trading",
  description: "Complete guide for copy trading leaders",
};

export default function Page() {
  return <LeaderGuidePage />;
}
