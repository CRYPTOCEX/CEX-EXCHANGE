import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/4 space-y-4">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>

        <div className="md:w-3/4 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-[150px]" />
            <Skeleton className="h-8 w-[200px]" />
          </div>

          {Array(5)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-full max-w-[400px]" />
                  <Skeleton className="h-4 w-full max-w-[300px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}

          <div className="flex justify-center mt-6">
            <Skeleton className="h-10 w-[300px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
