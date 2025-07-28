import type { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  name: string;
  description: string;
}

export function FeatureCard({ icon, name, description }: FeatureCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-md p-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="bg-white dark:bg-zinc-800 p-1.5 rounded shadow-sm">
          {icon}
        </div>
        <div className="text-xs font-medium text-gray-800 dark:text-white">
          {name}
        </div>
      </div>
      <p className="text-[10px] text-gray-500 dark:text-zinc-400 pl-8">
        {description}
      </p>
    </div>
  );
}
