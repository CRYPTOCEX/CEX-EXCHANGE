import type { Metadata } from "next";
import { GuidedMatchingPage } from "./client";

export const metadata: Metadata = {
  title: "CryptoP2P - Guided Matching",
  description:
    "Find the perfect cryptocurrency trading offers based on your preferences",
};

export default function GuidedMatching() {
  return <GuidedMatchingPage />;
}
