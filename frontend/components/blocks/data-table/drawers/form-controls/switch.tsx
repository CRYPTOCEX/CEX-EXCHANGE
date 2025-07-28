import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SwitchFormControlProps {
  field: any;
  error?: string;
  label: string;
}

export function SwitchFormControl({
  field,
  error,
  label,
}: SwitchFormControlProps) {
  const handleChange = (checked: boolean) => {
    field.onChange(checked);
  };

  return (
    <div>
      <div className="flex items-center space-x-2">
        <Switch
          id={field.name}
          checked={!!field.value}
          onCheckedChange={handleChange}
        />
        <Label htmlFor={field.name}>{label}</Label>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
