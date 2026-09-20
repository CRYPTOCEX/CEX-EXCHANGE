import type { Metadata } from "next";
import LeaderDetailPage from "./client";

export const metadata: Metadata = {
  title: "Leader Profile | Copy Trading",
  description: "View trader profile and copy their trades",
};

export default function Page() {
  return <LeaderDetailPage />;
}
