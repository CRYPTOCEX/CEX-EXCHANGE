import { Suspense } from "react";
import ConvertToFaqClient from "./client";

export default function ConvertToFaqPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ConvertToFaqClient />
    </Suspense>
  );
}
