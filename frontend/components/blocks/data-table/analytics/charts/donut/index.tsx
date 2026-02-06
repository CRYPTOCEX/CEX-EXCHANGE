import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChartData } from "./types";
import { Content } from "./content";
import { Legend } from "./legend";
import { PieChart } from "lucide-react";

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

  // Check if all values are zero (empty state)
  const isEmptyData = total === 0 && validData.length > 0;

  // When total is 0, create placeholder data with equal segments for visualization
  const displayData = useMemo(() => {
    if (isEmptyData) {
      // Give each segment equal value of 1 for display purposes (gray segments)
      return validData.map((item) => ({
        ...item,
        value: 1,
        _isEmpty: true,
      }));
    }
    return validData;
  }, [validData, isEmptyData]);

  const displayTotal = useMemo(() => {
    return isEmptyData ? validData.length : total;
  }, [total, validData, isEmptyData]);

  if (loading) {
    return (
      <Card className={cn("bg-transparent overflow-hidden", className)}>
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-semibold tracking-tight">
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="relative h-[200px] md:h-[240px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state only when there's truly no data (empty array)
  if (validData.length === 0) {
    return (
      <Card className={cn("bg-transparent overflow-hidden", className)}>
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-semibold tracking-tight">
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 items-center justify-center h-[200px] md:h-[240px]">
            <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
              <PieChart className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No data available</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Data will appear here once available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-transparent overflow-hidden", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-xl font-semibold tracking-tight">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Content
            data={displayData}
            activeSegment={activeSegment}
            setActiveSegment={setActiveSegment}
            total={displayTotal}
            isEmpty={isEmptyData}
          />
          <Legend
            data={validData}
            total={total}
            activeSegment={activeSegment}
            setActiveSegment={setActiveSegment}
            isEmpty={isEmptyData}
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
