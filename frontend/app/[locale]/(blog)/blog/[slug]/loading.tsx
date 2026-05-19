import { Skeleton } from "@/components/ui/skeleton";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export default function PostLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950 pt-24 pb-16">
      {/* Premium Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.03) 10%, rgba(139, 92, 246, 0.02) 30%, transparent 60%)`,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
        }}
      />
      <FloatingShapes
        count={6}
        interactive={true}
        theme={{ primary: "indigo", secondary: "purple" }}
      />
      <InteractivePattern
        config={{
          enabled: true,
          variant: "crosses",
          opacity: 0.01,
          size: 40,
          interactive: true,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <article className="mx-auto max-w-4xl">
          {/* Hero Section Skeleton */}
          <div className="relative mb-8 sm:mb-10 md:mb-12 overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl">
            {/* Hero Image with Overlay */}
            <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[65vh] w-full overflow-hidden">
              <Skeleton className="absolute inset-0 w-full h-full" />
              <div className="absolute inset-0 bg-linear-to-t from-indigo-900/90 via-indigo-900/50 to-indigo-900/20 dark:from-indigo-950/90 dark:via-indigo-950/50 dark:to-indigo-950/20"></div>

              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden opacity-30">
                <div className="absolute -top-10 sm:-top-20 -right-10 sm:-right-20 h-32 sm:h-60 w-32 sm:w-60 rounded-full bg-purple-500/30 blur-3xl"></div>
                <div className="absolute bottom-10 sm:bottom-20 left-10 sm:left-20 h-24 sm:h-40 w-24 sm:w-40 rounded-full bg-indigo-500/30 blur-3xl"></div>
              </div>

              {/* Content overlay skeleton */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 lg:p-12">
                <div className="mx-auto max-w-3xl">
                  {/* Category badge skeleton */}
                  <Skeleton className="h-6 sm:h-7 w-20 sm:w-24 rounded-full mb-3 sm:mb-4 bg-white/20" />

                  {/* Title skeleton */}
                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    <Skeleton className="h-8 sm:h-10 md:h-12 lg:h-14 w-full bg-white/20" />
                    <Skeleton className="h-8 sm:h-10 md:h-12 lg:h-14 w-4/5 bg-white/20" />
                  </div>

                  {/* Author info and meta skeleton */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                    {/* Author avatar and name */}
                    <div className="flex items-center">
                      <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/20" />
                      <Skeleton className="ml-2 sm:ml-3 h-4 sm:h-5 w-24 sm:w-32 bg-white/20" />
                    </div>

                    {/* Meta info (date, reading time, comments) */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <Skeleton className="h-4 w-20 sm:w-24 bg-white/20" />
                      <Skeleton className="h-4 w-16 sm:w-20 bg-white/20" />
                      <Skeleton className="h-4 w-20 sm:w-24 bg-white/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Post description skeleton */}
          <div className="mb-8 sm:mb-10">
            <Skeleton className="h-16 sm:h-20 md:h-24 w-full rounded-r-lg" />
          </div>

          {/* Content skeleton */}
          <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 md:mb-12">
            <Skeleton className="h-6 sm:h-8 w-2/3 sm:w-3/4" />
            <Skeleton className="h-4 sm:h-6 w-full" />
            <Skeleton className="h-4 sm:h-6 w-full" />
            <Skeleton className="h-4 sm:h-6 w-4/5 sm:w-5/6" />
            <Skeleton className="h-48 sm:h-56 md:h-64 w-full rounded-lg" />
            <Skeleton className="h-4 sm:h-6 w-full" />
            <Skeleton className="h-4 sm:h-6 w-full" />
            <Skeleton className="h-4 sm:h-6 w-3/4 sm:w-4/5" />
            <Skeleton className="h-6 sm:h-8 w-1/2 sm:w-2/3" />
            <Skeleton className="h-4 sm:h-6 w-full" />
            <Skeleton className="h-4 sm:h-6 w-full" />
          </div>

          {/* Author bio skeleton */}
          <div className="mt-8 sm:mt-10 md:mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8">
            <div className="bg-linear-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900/80 p-4 sm:p-6 md:p-8 rounded-xl">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                {/* Author avatar */}
                <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full shrink-0 mx-auto sm:mx-0" />

                {/* Author info */}
                <div className="flex-1 w-full text-center sm:text-left">
                  <Skeleton className="h-6 sm:h-7 w-32 sm:w-40 mb-2 mx-auto sm:mx-0" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5 mb-4 mx-auto sm:mx-0" />
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <Skeleton className="h-4 w-20 sm:w-24" />
                    <Skeleton className="h-4 w-28 sm:w-32" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags skeleton */}
          <div className="mt-8 sm:mt-10 md:mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8">
            <Skeleton className="h-6 w-16 sm:w-20 mb-4" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 sm:h-8 w-16 sm:w-20 rounded-full" />
              ))}
            </div>
          </div>

          {/* Related posts skeleton */}
          <div className="mt-8 sm:mt-10 md:mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8">
            <Skeleton className="h-6 sm:h-8 w-32 sm:w-40 mb-4 sm:mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl shadow-md bg-white dark:bg-zinc-800">
                  <Skeleton className="h-32 sm:h-40 w-full" />
                  <div className="p-3 sm:p-4 space-y-2">
                    <Skeleton className="h-5 sm:h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-20 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments section skeleton */}
          <div className="mt-8 sm:mt-10 md:mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8">
            <Skeleton className="h-6 sm:h-8 w-32 sm:w-48 mb-6 sm:mb-8" />
            <div className="space-y-4 sm:space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex space-x-3 sm:space-x-4">
                  <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 sm:h-5 w-24 sm:w-32 mb-2" />
                    <Skeleton className="h-3 sm:h-4 w-full" />
                    <Skeleton className="h-3 sm:h-4 w-3/4 mt-1" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 sm:mt-8 rounded-xl bg-white dark:bg-zinc-800 p-4 sm:p-6 shadow-sm border border-zinc-100 dark:border-zinc-700">
              <Skeleton className="h-5 sm:h-6 w-32 sm:w-40 mb-4" />
              <Skeleton className="h-32 sm:h-40 w-full rounded-lg" />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
