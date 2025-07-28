import type { Metadata } from "next";
import { DashboardClient } from "./client";

export const metadata: Metadata = {
  title: "CryptoP2P - Dashboard",
  description: "Peer-to-peer cryptocurrency trading platform dashboard",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
