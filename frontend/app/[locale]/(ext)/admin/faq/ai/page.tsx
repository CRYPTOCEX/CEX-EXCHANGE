import type { Metadata } from "next";
import { FAQAIAssistant } from "./client";
export const metadata: Metadata = {
  title: "FAQ AI Assistant",
  description: "Use AI to improve your FAQ content and answer questions",
};
export default function AdminAiPage() {
  return <FAQAIAssistant />;
}
