import { Suspense } from "react";
import AdminFAQClient from "./client";
import AdminFAQLoading from "./loading";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Manage FAQs",
  description: "Create and manage frequently asked questions for your users",
};
export default function AdminFAQPage() {
  return (
    <Suspense fallback={<AdminFAQLoading />}>
      <AdminFAQClient />
    </Suspense>
  );
}
