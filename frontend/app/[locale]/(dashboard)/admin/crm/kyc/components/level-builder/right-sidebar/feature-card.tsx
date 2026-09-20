import type { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  name: string;
  description: string;
}

export function FeatureCard({ icon, name, description }: FeatureCardProps) {
  return (
    <div className="bg-muted dark:bg-muted/50 border border-border-strong rounded-lg p-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-card">
          {icon}
        </div>
        <div className="text-xs font-medium text-foreground">
          {name}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground pl-8">
        {description}
      </p>
    </div>
  );
}
