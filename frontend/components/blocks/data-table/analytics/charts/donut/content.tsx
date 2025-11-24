import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartData } from "./types";
import { getColor } from "./utils";
import { CenterContent } from "./center-content";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentProps {
  data: ChartData[];
  activeSegment: string | null;
  setActiveSegment: React.Dispatch<React.SetStateAction<string | null>>;
  total: number;
  loading: boolean;
  isFirstLoad: boolean;
}

function ContentImpl({
  data,
  activeSegment,
  setActiveSegment,
  total,
  loading,
  isFirstLoad,
}: ContentProps) {
  if (loading && isFirstLoad) {
    return (
      <div className="relative flex-1 min-h-[200px] sm:min-h-[300px]">
        <Skeleton className="w-full h-full rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-[200px] sm:min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius="70%"
            outerRadius="90%"
            paddingAngle={2}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={2}
            stroke="hsl(var(--background))"
            onMouseEnter={(_, index: number) =>
              setActiveSegment(data[index].id)
            }
            onMouseLeave={() => setActiveSegment(null)}
          >
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={getColor(entry.color)}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  transform:
                    activeSegment === entry.id ? "scale(1.03)" : "scale(1)",
                  transformOrigin: "center",
                  opacity:
                    !activeSegment || activeSegment === entry.id ? 1 : 0.3,
                  outline: "none",
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <CenterContent
        activeSegment={activeSegment}
        data={data}
        total={total}
        loading={loading}
        isFirstLoad={isFirstLoad}
      />
    </div>
  );
}

export const Content = React.memo(ContentImpl);
