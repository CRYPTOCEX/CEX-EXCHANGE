import type { Metadata } from "next";
import AiTradingMarketClient from "./client";

export const metadata: Metadata = {
  title: "AI Market Makers | Admin Dashboard",
  description: "Manage AI-powered market makers for ecosystem trading",
};

export default function AiTradingMarketPage() {
  return <AiTradingMarketClient />;
}
