import type { Metadata } from "next";
import HealthClient from "./client";

export const metadata: Metadata = {
  title: "System Health | Copy Trading Admin",
  description: "Monitor copy trading system health",
};

export default function HealthPage() {
  return <HealthClient />;
}
