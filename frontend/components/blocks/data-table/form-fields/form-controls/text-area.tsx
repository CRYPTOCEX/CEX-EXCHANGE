// text-area.tsx
import React from "react";
import { LucideIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface TextAreaFormControlProps {
  field: any; // from react-hook-form
  error?: string;
  placeholder?: string;
  icon?: LucideIcon;
  title?: string;
  description?: string;
}

export function TextAreaFormControl({
  field,
  error,
  placeholder,
  icon: Icon,
  title,
  description,
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
      title={title}
      description={description}
    />
  );
}
