import { Suspense } from "react";
import UpdateApplicationClient from "./client";
import { Skeleton } from "@/components/ui/skeleton";

export default function UpdateApplicationPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <UpdateApplicationClient />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Skeleton className="h-10 w-10 rounded-full mr-4" />
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <Skeleton className="h-24 w-full rounded-lg mb-6" />

      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export const metadata = {
  title: "Update KYC Application",
  description: "Update your KYC application with additional information",
};
