import type { Metadata } from "next";
import CopyTradingLanding from "./client";

export const metadata: Metadata = {
  title: "Copy Trading | Follow Expert Traders",
  description:
    "Automatically copy trades from expert traders and grow your portfolio with our copy trading platform",
};

export default function CopyTradingPage() {
  return <CopyTradingLanding />;
}
