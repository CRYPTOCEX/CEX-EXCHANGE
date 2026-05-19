import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { type ValidationRules, validateValue } from "@/utils/validation";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Optional title to display above the textarea */
  title?: string;
  label?: string;
  /** If true, applies error styling (red border) */
  error?: boolean;
  /** The error message to display below the textarea */
  errorMessage?: string;
  /** Optional description to display below the textarea */
  description?: string;
  /** Validation rules to apply to the textarea */
  validationRules?: ValidationRules;
  /** If true, validate on change instead of blur */
  validateOnChange?: boolean;
  /** Size variant of the textarea */
  size?: "default" | "sm" | "lg";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      title,
      label,
      error = false,
      errorMessage,
      description,
      validationRules,
      validateOnChange = false,
      size = "default",
      value,
      ...props
    },
    ref
  ) => {
    // State to store validation error messages
    const [validationError, setValidationError] = React.useState<string>("");
    const hasError = error || !!validationError;
    const errorMsg = errorMessage || validationError;

    // Adjust padding based on size
    const paddingClass =
      size === "sm" ? "px-2 py-1.5" : size === "lg" ? "px-4 py-3" : "px-3 py-2";

    // Function to validate the textarea's value using the provided rules
    const validate = (value: any) => {
      if (!validationRules) return;
      const result = validateValue(value, validationRules);
      setValidationError(result.isValid ? "" : result.message);
      return result.isValid;
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (validationRules) {
        validate(e.target.value);
      }
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (validationRules && validateOnChange) {
        validate(e.target.value);
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <div className="flex flex-col w-full">
        {(title || label) && (
          <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            {title || label}
          </label>
        )}
        <textarea
          data-slot="textarea"
          ref={ref}
          className={cn(
            "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent shadow-2xs transition-[color,box-shadow] outline-hidden focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 text-sm",
            paddingClass,
            hasError &&
              "border-2 border-red-500 focus:ring-red-500 focus:ring-2",
            className
          )}
          onBlur={handleBlur}
          onChange={handleChange}
          value={value != null ? value : ""}
          {...props}
        />
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {hasError && errorMsg && (
          <div className="flex items-center gap-2 text-red-500 text-sm mt-1 bg-red-50 dark:bg-red-900/10 p-2 rounded-md">
            <X className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
