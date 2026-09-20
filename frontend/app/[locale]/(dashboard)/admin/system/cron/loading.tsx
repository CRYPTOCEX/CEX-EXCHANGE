import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";

/**
 * The Suspense fallback, shaped like the page it precedes.
 *
 * It mirrors the real layout — header, scheduler banner, five tiles, the 7/5
 * split — because a fallback with different proportions produces a visible
 * reflow the moment the client mounts, and this page mounts with a WebSocket
 * and two fetches in flight so that moment is not instant.
 */
export default function CronLoading() {
  return (
    <PageShell rhythm="sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>

      {/* Scheduler banner */}
      <Skeleton className="h-24 w-full rounded-lg" />

      {/* Five overview tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-7">
          <div className="space-y-3 border-b border-border p-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2 p-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden xl:col-span-5">
          <div className="border-b border-border p-3">
            <Skeleton className="h-8 w-40" />
          </div>
          <div className="space-y-1.5 p-3">
            {Array.from({ length: 14 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
