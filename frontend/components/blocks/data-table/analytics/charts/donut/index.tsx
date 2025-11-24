import React, { useState, useMemo, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChartData } from "./types";
import { Content } from "./content";
import { Legend } from "./legend";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusDistributionProps {
  data: ChartData[];
  config: ChartConfig;
  className?: string;
  loading?: boolean;
}

function StatusDistributionImpl({
  data,
  config,
  className,
  loading,
}: StatusDistributionProps) {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const hasRendered = useRef(false);

  const validData = useMemo(() => {
    return Array.isArray(data) && data.length > 0 ? data : [];
  }, [data]);

  const total = useMemo(
    () => validData.reduce((sum, item) => sum + (item.value || 0), 0),
    [validData]
  );

  useEffect(() => {
    if (!hasRendered.current) {
      hasRendered.current = true;
      setIsFirstLoad(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && isFirstLoad) {
      setIsFirstLoad(false);
    }
  }, [loading, isFirstLoad]);

  const renderSkeleton = () => (
    <Card className="bg-transparent h-full overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle>
          <Skeleton className="h-6 w-3/4" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-4rem)]">
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-48 w-48 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {Array.from({ length: 4 }).map((_, i: number) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (isFirstLoad) {
    return renderSkeleton();
  }

  return (
    <Card className={cn("bg-transparent h-full overflow-hidden", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-xl font-semibold tracking-tight">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-4rem)]">
        <div className="flex flex-col flex-1 gap-4">
          <Content
            data={validData}
            activeSegment={activeSegment}
            setActiveSegment={setActiveSegment}
            total={total}
            loading={loading || false}
            isFirstLoad={isFirstLoad}
          />
          <Legend
            data={validData}
            total={total}
            activeSegment={activeSegment}
            setActiveSegment={setActiveSegment}
            loading={loading || false}
            isFirstLoad={isFirstLoad}
          />
        </div>
      </CardContent>
    </Card>
  );
}

StatusDistributionImpl.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      color: PropTypes.string.isRequired,
    })
  ).isRequired,
  config: PropTypes.shape({
    title: PropTypes.string.isRequired,
  }).isRequired,
  className: PropTypes.string,
  loading: PropTypes.bool,
};

export const StatusDistribution = React.memo(StatusDistributionImpl);
export default StatusDistribution;
