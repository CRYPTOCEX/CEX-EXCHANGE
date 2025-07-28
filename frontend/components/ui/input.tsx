import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
import { type ValidationRules, validateValue } from "@/utils/validation";

export interface InputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "prefix" | "postfix"
  > {
  /** If true, apply error styling (red border) and display an error message below */
  error?: boolean;
  /** The error message to display below the input */
  errorMessage?: string;
  /**
   * Icon can be either:
   * - A string (Iconify icon name, e.g. "lucide:alert-circle")
   * - A React component (e.g. CalendarIcon from lucide-react)
   */
  icon?: string | React.ElementType;
  /** Extra classes for the icon */
  iconClassName?: string;
  /** Position of the icon: left or right */
  iconPosition?: "left" | "right";
  /** Optional title for the input */
  title?: string;
  /** Optional label for the input */
  label?: string;
  /** Optional description for the input */
  description?: string;
  /** If true, do not wrap the component in an extra div */
  removeWrapper?: boolean;
  /** Validation rules to apply to the input */
  validationRules?: ValidationRules;
  /** If true, validate on change instead of blur */
  validateOnChange?: boolean;
  /** Prefix content: can be text or a button */
  prefix?: string | React.ReactNode;
  /** Postfix content: can be text or a button */
  postfix?: string | React.ReactNode;
  /** If false, remove the focus ring styling */
  hasRing?: boolean;
  /** If false, remove the shadow styling */
  hasShadow?: boolean;
}

function renderIcon(icon: string | React.ElementType, iconClassName?: string) {
  if (!icon) return null;
  if (typeof icon === "string") {
    return (
      <Icon
        icon={icon}
        className={cn("h-4 w-4 text-muted-foreground", iconClassName)}
      />
    );
  } else {
    const IconComponent = icon;
    return (
      <IconComponent
        className={cn("h-4 w-4 text-muted-foreground", iconClassName)}
      />
    );
  }
}

// Base classes without focus ring and shadow classes
const BASE_CONTAINER_CLASSES =
  "border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-hidden disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex items-center";

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      removeWrapper = false,
      error = false,
      errorMessage,
      icon,
      iconClassName,
      iconPosition = "left",
      title,
      label,
      description,
      validationRules,
      validateOnChange = false,
      prefix,
      postfix,
      hasRing = true,
      hasShadow = true,
      ...props
    },
    ref
  ) => {
    const [validationError, setValidationError] = React.useState("");
    const hasError = error || !!validationError;
    const errorMsg = errorMessage || validationError;

    const validate = (value: string) => {
      if (!validationRules) return;
      const result = validateValue(value, validationRules);
      setValidationError(result.isValid ? "" : result.message);
      return result.isValid;
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (validationRules) {
        validate(e.target.value);
      }
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (validationRules && validateOnChange) {
        validate(e.target.value);
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

    // Conditionally apply focus ring and shadow classes based on props
    const ringClasses = hasRing
      ? "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      : "focus-visible:outline-none focus-visible:border-input";
    const shadowClass = hasShadow ? "shadow-sm" : "";

    const containerClasses = cn(
      BASE_CONTAINER_CLASSES,
      ringClasses,
      shadowClass,
      hasError && "border-2 border-red-500 focus:ring-red-500 focus:ring-2",
      className
    );

    const renderLeftIcon =
      icon && iconPosition === "left" ? renderIcon(icon, iconClassName) : null;
    const renderRightIcon =
      icon && iconPosition === "right" ? renderIcon(icon, iconClassName) : null;

    const inputElement = (
      <div className={containerClasses}>
        {prefix && <div className="mr-2 flex-shrink-0">{prefix}</div>}
        {renderLeftIcon && (
          <div className="mr-2 pointer-events-none flex-shrink-0">
            {renderLeftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          data-slot="input"
          className="flex-1 bg-transparent border-none p-0 m-0 focus:outline-none focus:ring-0"
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />
        {renderRightIcon && (
          <div className="ml-2 pointer-events-none flex-shrink-0">
            {renderRightIcon}
          </div>
        )}
        {postfix && <div className="ml-2 flex-shrink-0">{postfix}</div>}
      </div>
    );

    const content = (
      <>
        {(title || label) && (
          <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            {title || label}
          </label>
        )}
        {inputElement}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {hasError && errorMsg && (
          <p className="text-red-500 text-sm mt-1 leading-normal">{errorMsg}</p>
        )}
      </>
    );

    return removeWrapper ? (
      content
    ) : (
      <div className="flex-1 w-full flex flex-col">{content}</div>
    );
  }
);

Input.displayName = "Input";
export { Input };
