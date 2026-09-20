import { Star } from "lucide-react";

interface EmptyStateRowsProps {
  count?: number;
}

/** Invisible spacer rows (`opacity-0`) that keep a short list from collapsing. */
export function EmptyStateRows({ count = 5 }: EmptyStateRowsProps) {
  return (
    <>
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            key={`empty-${index}`}
            className="flex items-center justify-between border-b border-border px-2 py-1.5 opacity-0"
          >
            <div className="flex items-center">
              <div className="mr-2 h-3 w-3">
                <Star className="h-3 w-3" />
              </div>
              <div className="flex flex-col">
                <div className="h-4 w-16"></div>
                <div className="mt-0.5 h-3 w-12"></div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="h-4 w-14"></div>
              <div className="mt-0.5 h-3 w-10"></div>
            </div>
          </div>
        ))}
    </>
  );
}
