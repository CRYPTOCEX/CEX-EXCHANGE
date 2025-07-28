// text-area.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
// If you have a Textarea component in your UI library, import it:
import { Textarea } from "@/components/ui/textarea";

interface TextAreaFormControlProps {
  field: any; // from react-hook-form
  error?: string;
  placeholder?: string;
  icon?: LucideIcon;
}

export function TextAreaFormControl({
  field,
  error,
  placeholder,
  icon: Icon,
}: TextAreaFormControlProps) {
  const safeValue = typeof field.value === "undefined" ? "" : field.value;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    field.onChange(e.target.value);
  };

  return (
    <Textarea
      value={safeValue}
      onChange={handleChange}
      placeholder={placeholder}
      error={!!error}
      errorMessage={error}
      rows={5}
    />
  );
}
