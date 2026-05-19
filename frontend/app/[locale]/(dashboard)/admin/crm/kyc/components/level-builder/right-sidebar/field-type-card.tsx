import type { ReactNode } from "react";

interface FieldTypeCardProps {
  icon: ReactNode;
  name: string;
  category: string;
  color: string;
}

export function FieldTypeCard({
  icon,
  name,
  category,
  color,
}: FieldTypeCardProps) {
  return (
    <div
      className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-100 dark:border-${color}-800/30 rounded-md p-2 flex items-center gap-2`}
    >
      <div className={`bg-${color}-100 dark:bg-${color}-800/30 p-1.5 rounded`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-medium text-gray-800 dark:text-white">
          {name}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-zinc-400">
          {category}
        </div>
      </div>
    </div>
  );
}
