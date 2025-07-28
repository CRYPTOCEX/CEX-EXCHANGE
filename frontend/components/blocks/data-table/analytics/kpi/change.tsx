import React from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import PropTypes from "prop-types";

interface ChangeProps {
  change?: number;
  loading?: boolean;
}

const DECIMAL_PLACES = 2;

// 1) define the base function
function ChangeImpl({ change, loading }: ChangeProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" /> {/* Arrow icon skeleton */}
        <Skeleton className="h-4 w-12" /> {/* Percentage skeleton */}
      </div>
    );
  }

  if (change === undefined) {
    return null;
  }

  const isPositive = change >= 0;
  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        isPositive ? "text-emerald-500" : "text-rose-500"
      )}
    >
      {isPositive ? (
        <ArrowUpIcon className="h-4 w-4" />
      ) : (
        <ArrowDownIcon className="h-4 w-4" />
      )}
      <span className="text-sm font-medium tabular-nums">
        {Math.abs(change).toFixed(DECIMAL_PLACES)}%
      </span>
    </div>
  );
}

// 2) assign propTypes to the function
ChangeImpl.propTypes = {
  change: PropTypes.number,
  loading: PropTypes.bool,
};

// 3) optional display name
ChangeImpl.displayName = "Change";

// 4) wrap with React.memo
export const Change = React.memo(ChangeImpl);
