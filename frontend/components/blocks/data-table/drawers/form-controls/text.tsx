import React from "react";
import { Input } from "@/components/ui/input";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextFormControlProps {
  field: any; // from react-hook-form
  error?: string; // the error message (e.g. "Required")
  placeholder: string;
  icon?: LucideIcon;
}

export function TextFormControl({
  field,
  error,
  placeholder,
  icon: Icon,
}: TextFormControlProps) {
  const safeValue = typeof field.value === "undefined" ? "" : field.value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.onChange(e.target.value);
  };

  // We set `error={!!error}` so if error is a non-empty string, it goes red
  // We set `errorMessage={error}` so the Input shows that text below it.
  return (
    <Input
      type="text"
      value={safeValue}
      onChange={handleChange}
      placeholder={placeholder}
      error={!!error}
      errorMessage={error}
      icon={Icon}
    />
  );
}
