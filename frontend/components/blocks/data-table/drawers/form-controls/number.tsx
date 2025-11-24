import React from "react";
import { Input } from "@/components/ui/input";

interface NumberFormControlProps {
  field: any;
  error?: string;
  placeholder: string;
  icon?: any;
}

export function NumberFormControl({
  field,
  error,
  placeholder,
  icon,
}: NumberFormControlProps) {
  // Provide a fallback empty string if field.value is null or undefined.
  const safeValue = field.value != null ? field.value : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.onChange(e.target.value);
  };

  return (
    <Input
      type="number"
      value={safeValue}
      onChange={handleChange}
      placeholder={placeholder}
      error={!!error}
      errorMessage={error}
      icon={icon}
    />
  );
}
