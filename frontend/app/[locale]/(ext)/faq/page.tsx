import type { Metadata } from "next";
import FAQClient from "./client";
import { ErrorBoundary } from "@/components/faq/error-boundary";

export const metadata: Metadata = {
  title: "FAQ - Knowledge Base",
  description: "Find answers to common questions about our platform.",
};

export default function FAQPage() {
  return (
    <ErrorBoundary>
      <FAQClient />
    </ErrorBoundary>
  );
}
