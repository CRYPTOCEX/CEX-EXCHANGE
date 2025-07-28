import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function OfferLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section Skeleton */}
      <div className="relative bg-primary/80 py-12 md:py-20">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-6 md:mb-0">
              <Skeleton className="h-9 w-32 mb-6 bg-white/20" />
              <Skeleton className="h-10 w-64 mb-3 bg-white/20" />
              <Skeleton className="h-5 w-48 bg-white/20" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-16 w-24 bg-white/20 rounded-lg" />
              <Skeleton className="h-16 w-24 bg-white/20 rounded-lg" />
            </div>
          </div>

          {/* Quick Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-white/20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <Skeleton className="h-8 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Skeleton className="h-32 w-full rounded-lg" />
                      </div>
                      <div className="space-y-4">
                        <Skeleton className="h-32 w-full rounded-lg" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40 mb-2" />
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-start">
                    <div className="flex items-center mb-6 md:mb-0 md:mr-6">
                      <Skeleton className="h-16 w-16 rounded-full mr-4" />
                      <div>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:ml-auto w-full">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-md" />
                      ))}
                    </div>
                  </div>

                  <div className="my-6 h-px bg-border" />

                  <div className="space-y-4">
                    <Skeleton className="h-5 w-32" />
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center">
                          <Skeleton className="h-4 w-24 mr-2" />
                          <Skeleton className="h-2 flex-1" />
                          <Skeleton className="h-4 w-8 ml-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-10 w-full" />
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-10 w-full" />
                    </div>

                    <Skeleton className="h-32 w-full rounded-md" />

                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <div className="space-y-2">
                        {[...Array(2)].map((_, i) => (
                          <Skeleton
                            key={i}
                            className="h-14 w-full rounded-md"
                          />
                        ))}
                      </div>
                    </div>

                    <Skeleton className="h-20 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
