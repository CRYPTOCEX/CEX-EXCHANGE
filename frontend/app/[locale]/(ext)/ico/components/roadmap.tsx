"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useRoadmapStore } from "@/store/ico/creator/roadmap-store";

interface RoadmapProps {
  offeringId: string;
}

export function Roadmap({ offeringId }: RoadmapProps) {
  const { roadmapItems, fetchRoadmap } = useRoadmapStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchRoadmap(offeringId);
      setIsLoading(false);
    };

    loadData();
  }, [offeringId, fetchRoadmap]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-6 w-6 rounded-full bg-muted mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {roadmapItems.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          {item.completed ? (
            <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h4 className="font-medium">{item.title}</h4>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            {item.date && (
              <p className="text-xs text-muted-foreground">{item.date}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
