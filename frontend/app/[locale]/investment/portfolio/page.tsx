import type { Metadata } from "next";
import PortfolioClient from "./client";

export const metadata: Metadata = {
  title: "My investments",
  description:
    "Positions you have running, how long each has left, and everything that has already settled.",
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
