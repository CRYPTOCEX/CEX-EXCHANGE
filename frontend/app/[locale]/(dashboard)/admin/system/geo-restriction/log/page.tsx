import type { Metadata } from "next";
import GeoAccessLogClient from "./client";

export const metadata: Metadata = {
  title: "Geographic Access Log - Admin Dashboard",
  description:
    "Audit trail of every geographic access decision, with CSV export for compliance reporting.",
};

export default function GeoAccessLogPage() {
  return <GeoAccessLogClient />;
}
