import { Suspense } from "react";
import AdminFeedbackClient from "./client";
import AdminFeedbackLoading from "./loading";
export default function AdminFeedbackPage() {
  return (
    <Suspense fallback={<AdminFeedbackLoading />}>
      <AdminFeedbackClient />
    </Suspense>
  );
}
