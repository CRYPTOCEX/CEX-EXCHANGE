import { Skeleton } from "@/components/ui/skeleton";

export default function LeadersLoading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <div className="relative overflow-hidden border-b border-zinc-200/50 dark:border-zinc-800/50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-12 w-96 mb-4" />
          <Skeleton className="h-6 w-full max-w-2xl mb-8" />
          <div className="flex gap-6">
            <Skeleton className="h-16 w-32" />
            <Skeleton className="h-16 w-32" />
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
