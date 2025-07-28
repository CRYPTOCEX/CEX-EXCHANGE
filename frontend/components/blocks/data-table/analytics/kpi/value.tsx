import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import PropTypes from "prop-types";

interface ValueProps {
  value?: number;
  loading?: boolean;
}

// 1) define base function
function ValueImpl({ value, loading }: ValueProps) {
  if (loading) {
    return <Skeleton className="h-9 w-24" />;
  }

  return (
    <p className="text-2xl sm:text-3xl font-bold tabular-nums truncate">
      {value !== undefined ? value.toLocaleString() : "N/A"}
    </p>
  );
}

// 2) define propTypes
ValueImpl.propTypes = {
  value: PropTypes.number,
  loading: PropTypes.bool,
};

ValueImpl.displayName = "Value";

// 3) wrap in memo
export const Value = React.memo(ValueImpl);
