"use client";

import { Suspense } from "react";
import FAQFormPage from "./client";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export default function FAQEditPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <Suspense fallback={<FAQFormSkeleton />}>
        <FAQFormPage />
      </Suspense>
    </div>
  );
}
function FAQFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="border rounded-md p-6 space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
