import type { Metadata } from "next";
import LeadersPage from "./client";

export const metadata: Metadata = {
  title: "Copy Trading Leaders | Find Expert Traders",
  description:
    "Browse and follow expert traders to automatically copy their trades",
};

export default function Page() {
  return <LeadersPage />;
}
