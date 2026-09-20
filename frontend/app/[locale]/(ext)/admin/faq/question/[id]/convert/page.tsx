import { Suspense } from "react";
import ConvertToFaqClient from "./client";
import { getTranslations } from "next-intl/server";

export default function ConvertToFaqPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ConvertToFaqClient />
    </Suspense>
  );
}
