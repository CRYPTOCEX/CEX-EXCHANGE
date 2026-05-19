import type { Metadata } from "next";
import { FAQAIAssistant } from "./client";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
export const metadata: Metadata = {
  title: "FAQ AI Assistant",
  description: "Use AI to improve your FAQ content and answer questions",
};
export default function AdminAiPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <FAQAIAssistant />
    </div>
  );
}
