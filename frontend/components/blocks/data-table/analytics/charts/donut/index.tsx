import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChartData } from "./types";
import { Content } from "./content";
import { Legend } from "./legend";

interface ChartConfig {
  id?: string;
  title: string;
  type?: string;
  [key: string]: any;
}

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

  const validData = useMemo(() => {
    return Array.isArray(data) && data.length > 0 ? data : [];
  }, [data]);

  const total = useMemo(
    () => validData.reduce((sum, item) => sum + (item.value || 0), 0),
    [validData]
  );

  if (loading) {
    return (
      <Card className={cn("bg-transparent h-full overflow-hidden", className)}>
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-semibold tracking-tight">
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-[calc(100%-4rem)]">
          <div className="flex flex-col flex-1 gap-4">
            <div className="relative flex-1 min-h-[200px] sm:min-h-[300px] flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
          />
          <Legend
            data={validData}
            total={total}
            activeSegment={activeSegment}
            setActiveSegment={setActiveSegment}
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
