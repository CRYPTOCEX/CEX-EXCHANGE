import type { Metadata } from "next";
import TradeDashboardClient from "./client";

export const metadata: Metadata = {
  title: "CryptoP2P - Trade Dashboard",
  description:
    "Manage your cryptocurrency trades and monitor your trading activity",
};

export default function TradeDashboardPage() {
  return <TradeDashboardClient />;
}
