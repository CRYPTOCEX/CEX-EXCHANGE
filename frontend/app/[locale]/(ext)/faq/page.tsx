import type { Metadata } from "next";
import FAQClient from "./client";

export const metadata: Metadata = {
  title: "FAQ - Knowledge Base",
  description: "Find answers to common questions about our platform.",
};

export default function FAQPage() {
  return <FAQClient />;
}
