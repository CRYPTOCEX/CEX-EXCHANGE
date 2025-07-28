import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

export default function PlanDetailLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-900">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left column - Plan details */}
            <div className="lg:col-span-2 pb-12">
              {/* Header with back button and title */}
              <div className="flex flex-wrap items-center justify-start gap-4 mb-6">
                <Button variant="outline" size="icon" disabled>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="ml-3 h-6 w-24" />
                  </div>
                  <Skeleton className="h-5 w-full max-w-md mt-1" />
                </div>
              </div>

              {/* Hero image card */}
              <Card className="overflow-hidden mb-8 shadow-md border-0 bg-white dark:bg-zinc-800">
                <div className="relative h-64 sm:h-80">
                  <Skeleton className="h-full w-full absolute" />
                </div>
              </Card>

              {/* Content tabs */}
              <div className="space-y-6">
                {/* Plan highlights card */}
                <Card className="bg-white dark:bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-2" />
                      <Skeleton className="h-6 w-32" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Left column stats */}
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={`left-${i}`}>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-7 w-32" />
                          </div>
                        ))}
                      </div>
                      {/* Right column stats */}
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={`right-${i}`}>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-7 w-32" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Security features card */}
                <Card className="bg-white dark:bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-2" />
                      <Skeleton className="h-6 w-40" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Features grid */}
                      {[...Array(4)].map((_, i) => (
                        <div key={`feature-${i}`} className="flex items-start">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 mr-3" />
                          <div>
                            <Skeleton className="h-5 w-32 mb-1" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* FAQ card */}
                <Card className="bg-white dark:bg-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-2" />
                      <Skeleton className="h-6 w-48" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={`faq-${i}`} className="border-b pb-3">
                          <Skeleton className="h-5 w-full max-w-md mb-2" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right column - Investment form */}
            <div className="lg:col-span-1">
              <Card className="sticky top-22 shadow-lg bg-white dark:bg-zinc-950/40 rounded-lg">
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-t-lg px-6 py-4">
                  <CardTitle className="text-xl">
                    <Skeleton className="h-7 w-48" />
                  </CardTitle>
                  <CardDescription>
                    <Skeleton className="h-4 w-32 mt-1" />
                  </CardDescription>
                </div>
                <div className="px-6 pt-6 pb-3">
                  {/* Step indicators */}
                  <div className="flex items-center justify-between mb-6">
                    {[1, 2, 3].map((step) => (
                      <div
                        key={`step-${step}`}
                        className="flex flex-col items-center"
                      >
                        <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-1">
                          {step}
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
                <CardContent className="px-6">
                  {/* Form content */}
                  <div className="space-y-6">
                    {/* Duration selection */}
                    <div>
                      <Skeleton className="h-5 w-40 mb-3" />
                      <div className="grid grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton
                            key={`duration-${i}`}
                            className="h-12 w-full rounded-lg"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Info box */}
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-zinc-100 dark:bg-zinc-900 px-6 py-3 rounded-b-lg">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
