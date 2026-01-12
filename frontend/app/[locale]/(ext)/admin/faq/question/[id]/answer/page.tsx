import { Suspense } from "react";
import AnswerQuestionClient from "./client";
import { getTranslations } from "next-intl/server";

export default function AnswerQuestionPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <AnswerQuestionClient />
    </Suspense>
  );
}
