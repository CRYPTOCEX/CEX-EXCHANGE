import React from "react";
import { Input } from "@/components/ui/input";
import { LucideIcon } from "lucide-react";

interface TextFormControlProps {
  field: any; // from react-hook-form
  error?: string; // the error message (e.g. "Required")
  placeholder: string;
  icon?: LucideIcon;
  title?: string;
  description?: string;
}

export function TextFormControl({
  field,
  error,
  placeholder,
  icon: Icon,
  title,
  description,
}: TextFormControlProps) {
  const safeValue = typeof field.value === "undefined" ? "" : field.value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.onChange(e.target.value);
  };

  return (
    <Input
      type="text"
      value={safeValue}
      onChange={handleChange}
      placeholder={placeholder}
      error={!!error}
      errorMessage={error}
      icon={Icon}
      title={title}
      description={description}
    />
  );
}
