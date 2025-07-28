import { Skeleton } from "@/components/ui/skeleton";

export default function DepositLoading() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <Skeleton className="h-10 w-48 bg-zinc-800 mb-2" />
          <Skeleton className="h-5 w-64 bg-zinc-800" />
        </div>
        <Skeleton className="h-10 w-40 bg-zinc-800 rounded-md" />
      </div>

      {/* Progress bar */}
      <Skeleton className="h-1 w-full bg-zinc-800 mb-10" />

      <div className="flex gap-10">
        {/* Left side - Vertical stepper */}
        <div className="w-64">
          <div className="relative">
            {/* Step 1 */}
            <div className="flex items-start mb-16">
              <div className="relative">
                <Skeleton className="h-10 w-10 rounded-full bg-zinc-700" />
                <div className="absolute top-10 left-5 w-[2px] h-16 bg-zinc-700"></div>
              </div>
              <div className="ml-4">
                <Skeleton className="h-5 w-24 bg-zinc-800 mb-2" />
                <Skeleton className="h-4 w-40 bg-zinc-800" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start mb-16">
              <div className="relative">
                <Skeleton className="h-10 w-10 rounded-full bg-zinc-700" />
                <div className="absolute top-10 left-5 w-[2px] h-16 bg-zinc-700"></div>
              </div>
              <div className="ml-4">
                <Skeleton className="h-5 w-24 bg-zinc-800 mb-2" />
                <Skeleton className="h-4 w-40 bg-zinc-800" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start mb-16">
              <div className="relative">
                <Skeleton className="h-10 w-10 rounded-full bg-zinc-700" />
                <div className="absolute top-10 left-5 w-[2px] h-16 bg-zinc-700"></div>
              </div>
              <div className="ml-4">
                <Skeleton className="h-5 w-24 bg-zinc-800 mb-2" />
                <Skeleton className="h-4 w-40 bg-zinc-800" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start">
              <Skeleton className="h-10 w-10 rounded-full bg-zinc-700" />
              <div className="ml-4">
                <Skeleton className="h-5 w-24 bg-zinc-800 mb-2" />
                <Skeleton className="h-4 w-40 bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Content */}
        <div className="flex-1">
          <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/50">
            <Skeleton className="h-7 w-48 bg-zinc-800 mb-3" />
            <Skeleton className="h-5 w-72 bg-zinc-800 mb-8" />

            {/* Option 1 */}
            <div className="border border-zinc-800 rounded-lg p-4 mb-4 hover:bg-zinc-800/30">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 bg-zinc-800 rounded mr-4" />
                <div>
                  <Skeleton className="h-5 w-32 bg-zinc-800 mb-2" />
                  <Skeleton className="h-4 w-56 bg-zinc-800" />
                </div>
              </div>
            </div>

            {/* Option 2 */}
            <div className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/30">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 bg-zinc-800 rounded mr-4" />
                <div>
                  <Skeleton className="h-5 w-32 bg-zinc-800 mb-2" />
                  <Skeleton className="h-4 w-56 bg-zinc-800" />
                </div>
              </div>
            </div>
          </div>

          {/* Next button */}
          <div className="flex justify-end mt-6">
            <Skeleton className="h-10 w-24 bg-zinc-800 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
