import { Skeleton } from "@/components/ui/skeleton";

export default function PostLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <Skeleton className="h-4 sm:h-6 w-24 sm:w-32 mb-6 sm:mb-8" /> {/* Back button */}
      <article className="mx-auto max-w-4xl">
        {/* Hero section skeleton */}
        <Skeleton className="h-[40vh] sm:h-[50vh] md:h-[60vh] w-full rounded-2xl sm:rounded-3xl mb-8 sm:mb-10 md:mb-12" />

        {/* Post description skeleton */}
        <Skeleton className="h-16 sm:h-20 md:h-24 w-full rounded-lg mb-8 sm:mb-10" />

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
        <div className="mt-8 sm:mt-10 md:mt-12 border-t border-gray-200 dark:border-gray-700 pt-6 sm:pt-8">
          <Skeleton className="h-16 sm:h-20 md:h-24 w-full rounded-xl mb-8 sm:mb-10 md:mb-12" />
        </div>

        {/* Tags skeleton */}
        <div className="mt-8 sm:mt-10 md:mt-12 border-t border-gray-200 dark:border-gray-700 pt-6 sm:pt-8">
          <Skeleton className="h-6 w-16 sm:w-20 mb-4" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 sm:h-8 w-16 sm:w-20 rounded-full" />
            ))}
          </div>
        </div>

        {/* Related posts skeleton */}
        <div className="mt-8 sm:mt-10 md:mt-12 border-t border-gray-200 dark:border-gray-700 pt-6 sm:pt-8">
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-40 mb-4 sm:mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-32 sm:h-40 w-full rounded-xl" />
                <Skeleton className="h-4 sm:h-5 w-3/4" />
                <Skeleton className="h-3 sm:h-4 w-full" />
                <Skeleton className="h-3 sm:h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>

        {/* Comments section skeleton */}
        <div className="mt-8 sm:mt-10 md:mt-12 border-t border-gray-200 dark:border-gray-700 pt-6 sm:pt-8">
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-48 mb-6 sm:mb-8" />
          <div className="space-y-4 sm:space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex space-x-3 sm:space-x-4">
                <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 sm:h-5 w-24 sm:w-32 mb-2" />
                  <Skeleton className="h-3 sm:h-4 w-full" />
                  <Skeleton className="h-3 sm:h-4 w-3/4 mt-1" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-32 sm:h-40 w-full rounded-lg mt-6 sm:mt-8" />
        </div>
      </article>
    </div>
  );
}
