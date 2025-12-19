import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function AboutLoading() {
  const t = useTranslations("ext_ico");
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <div className="container mx-auto pt-24 pb-16">
        {/* Header skeleton */}
        <div className="text-center mb-16">
          <Skeleton className="h-14 w-96 mx-auto mb-4" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
        </div>

        {/* Content sections skeleton */}
        <div className="space-y-16">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-8">
              <Skeleton className="h-8 w-64 mb-6" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 dark:text-teal-400 mb-4" />
          <p className="text-gray-600 dark:text-zinc-400 text-lg">{t("loading_information_ellipsis")}</p>
        </div>
      </div>
    </div>
  );
}
