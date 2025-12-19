import { Suspense } from "react";
import AnswerQuestionClient from "./client";

export default function AnswerQuestionPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <AnswerQuestionClient />
    </Suspense>
  );
}
