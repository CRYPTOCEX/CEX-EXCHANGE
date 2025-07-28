import { Star } from "lucide-react";

interface EmptyStateRowsProps {
  count?: number;
}

export function EmptyStateRows({ count = 5 }: EmptyStateRowsProps) {
  return (
    <>
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            key={`empty-${index}`}
            className="flex items-center justify-between py-1.5 px-2 border-b border-zinc-200/10 dark:border-zinc-900/10 opacity-0"
          >
            <div className="flex items-center">
              <div className="mr-2 h-3 w-3">
                <Star className="h-3 w-3" />
              </div>
              <div className="flex flex-col">
                <div className="h-4 w-16"></div>
                <div className="h-3 mt-0.5 w-12"></div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="h-4 w-14"></div>
              <div className="h-3 mt-0.5 w-10"></div>
            </div>
          </div>
        ))}
    </>
  );
}
