import type { Metadata } from "next";
import PlansClient from "./client";

export const metadata: Metadata = {
  title: "Investment plans",
  description:
    "Every plan open for new investment, with its rate, its terms, the currency it takes and what it pays at maturity.",
};

export default function PlansPage() {
  return <PlansClient />;
}
