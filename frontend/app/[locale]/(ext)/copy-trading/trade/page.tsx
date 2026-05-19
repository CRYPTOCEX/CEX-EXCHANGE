import type { Metadata } from "next";
import TradeClient from "./client";

export const metadata: Metadata = {
  title: "My Copy Trades | Copy Trading",
  description: "View your copy trading trade history",
};

export default function TradePage() {
  return <TradeClient />;
}
