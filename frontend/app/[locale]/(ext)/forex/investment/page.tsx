import type { Metadata } from "next";
import ForexInvestmentsClient from "./client";

export const metadata: Metadata = {
  title: "Forex Investments",
  description: "View and manage your forex investments",
};

export default function ForexInvestmentsPage() {
  return <ForexInvestmentsClient />;
}
