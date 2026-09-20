import type { ReactNode } from "react";
import { FIELD_TONE } from "../field-tokens";

interface FieldTypeCardProps {
  icon: ReactNode;
  name: string;
  category: string;
}

export function FieldTypeCard({ icon, name, category }: FieldTypeCardProps) {
  return (
    <div
      className={`border rounded-md p-2 flex items-center gap-2 ${FIELD_TONE.strip}`}
    >
      <div className={`p-1.5 rounded ${FIELD_TONE.chipOnStrip}`}>{icon}</div>
      <div>
        <div className="text-xs font-medium text-foreground">{name}</div>
        <div className="text-[10px] text-subtle-foreground">{category}</div>
      </div>
    </div>
  );
}
