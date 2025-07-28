"use client";
import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

export function Roadmap({
  items,
}: {
  items: icoRoadmapItemAttributes[] | null;
}) {
  if (!items) return null;
  return (
    <div className="space-y-8">
      {items.map((item) => (
        <div key={item.id} className="flex gap-4">
          {item.completed ? (
            <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
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
