import { Suspense } from "react";
import AdminQuestionsClient from "./client";
import AdminQuestionsLoading from "./loading";
export default function AdminQuestionsPage() {
  return (
    <Suspense fallback={<AdminQuestionsLoading />}>
      <AdminQuestionsClient />
    </Suspense>
  );
}
