import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function AccountLoading() {
  const t = useTranslations("ext_forex");
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Decorative background glows */}
      <div
        className={`absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none`}
      />
      <div
        className={`absolute top-1/2 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none`}
      />

      <div className="container mx-auto pt-24 pb-16">
        {/* Header skeleton */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* DataTable skeleton */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden">
          {/* Table header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-64" />
            </div>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="w-10 h-10" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2
            className={`h-12 w-12 animate-spin text-emerald-600 dark:text-emerald-400 mb-4`}
          />
          <p className="text-gray-600 dark:text-zinc-400 text-lg">
            {t("loading_accounts_ellipsis")}
          </p>
        </div>
      </div>
    </div>
  );
}
