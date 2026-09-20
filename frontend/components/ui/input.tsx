import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
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
   * - A stored icon name, e.g. "lucide:alert-circle" or "mdi:magnify". Resolved
   *   LOCALLY through `components/ui/icon`; a name that table does not know
   *   draws nothing. The string form exists for `column.icon` in modelConfig,
   *   which arrives as data — prefer passing the component in hand-written JSX.
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

/**
 * Base classes for the WRAPPER.
 *
 * This component renders a styled wrapper `<div>` around an unstyled `<input>`
 * so it can host prefix/postfix/icons. That made four whole utility groups DEAD
 * on all 774 call sites, because each one only ever matches a real form control:
 *
 *   focus-visible:*  -> a <div> with no tabindex is never focused
 *   disabled:*       -> :disabled only matches form elements
 *   placeholder:*    -> ::placeholder only applies to input/textarea
 *   aria-invalid:*   -> {...props} spreads aria-invalid onto the INNER input
 *
 * The inner input additionally cleared its own outline (`focus:outline-none
 * focus:ring-0`) and nothing replaced it, so **the platform's primary text
 * input had no visible focus indicator at all** — the largest keyboard-access
 * hole in the product. Symptoms were visible in the call sites: 12 re-added
 * `placeholder:text-muted-foreground` by hand and 11 re-added
 * `cursor-not-allowed`.
 *
 * The state now keys off the real control via `has-*`, so the ring/dim wraps
 * the whole box (prefix and postfix included) while still being driven by the
 * input's actual state. `has-[input:focus-visible]` rather than `focus-within`
 * is deliberate: `focus-within` also fires on mouse click, which would put a
 * focus ring on every field the user merely clicks into.
 */
const BASE_CONTAINER_CLASSES =
  // Height, corners, border and inline padding follow the control tokens, so a
  // field lines up with the button beside it at any density — h-9 is the same
  // step as `size="sm"`, and both are now the same multiplier.
  "border-input selection:bg-primary selection:text-primary-foreground h-[calc(2.25rem*var(--control-height-scale))] w-full min-w-0 rounded-[calc(var(--radius-md)*var(--control-radius-scale))] border-[length:var(--control-border-width)] bg-transparent px-[calc(0.75rem*var(--control-padding-scale))] py-1 text-base transition-[color,box-shadow] outline-hidden has-[input:disabled]:pointer-events-none has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50 md:text-sm has-[input[aria-invalid='true']]:border-destructive has-[input[aria-invalid='true']]:ring-destructive/20 dark:has-[input[aria-invalid='true']]:ring-destructive/40 flex items-center";

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
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const [validationError, setValidationError] = React.useState("");
    const hasError = error || !!validationError;
    const errorMsg = errorMessage || validationError;

    // The built-in `label` / `title` prop used to render a <label> with no
    // `htmlFor`, so clicking it did not focus the field and a screen reader
    // announced the input as unlabelled. Same bug in textarea/select. 155 call
    // sites rely on this prop, so generating the id here fixes all of them at
    // once rather than asking every caller to pass one.
    const reactId = React.useId();
    const inputId = props.id ?? reactId;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = hasError && errorMsg ? `${inputId}-error` : undefined;
    const describedBy =
      [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(" ") ||
      undefined;

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

    // Keyed off the real control, not the wrapper — see BASE_CONTAINER_CLASSES.
    const ringClasses = hasRing
      ? "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-[3px]"
      : "has-[input:focus-visible]:border-input";
    // Every other control in the system is `shadow-2xs`; Input was the only one
    // on `shadow-sm`, so a Select beside an Input sat at a different elevation.
    const shadowClass = hasShadow ? "shadow-2xs" : "";

    const containerClasses = cn(
      BASE_CONTAINER_CLASSES,
      ringClasses,
      shadowClass,
      // The error style used to be `border-2`, which grows the box by 2px and
      // shifts the text 1px the instant validation fails — in a grid of fields
      // only the invalid one jumps. A ring costs no layout.
      hasError && "border-destructive ring-[3px] ring-destructive/20 dark:ring-destructive/40",
      className
    );

    const renderLeftIcon =
      icon && iconPosition === "left" ? renderIcon(icon, iconClassName) : null;
    const renderRightIcon =
      icon && iconPosition === "right" ? renderIcon(icon, iconClassName) : null;

    const inputElement = (
      <div className={containerClasses}>
        {prefix && <div className="ltr:mr-2 rtl:ml-2 flex-shrink-0">{prefix}</div>}
        {renderLeftIcon && (
          <div className="mr-2 pointer-events-none flex-shrink-0">
            {renderLeftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          id={inputId}
          data-slot="input"
          // The wrapper draws the focus ring for the whole box (see
          // BASE_CONTAINER_CLASSES), so the inner control is deliberately
          // ringless — but it keeps the placeholder colour, which only a real
          // input can carry.
          className="flex-1 min-w-0 bg-transparent border-none p-0 m-0 outline-hidden placeholder:text-muted-foreground"
          onBlur={handleBlur}
          onChange={handleChange}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {renderRightIcon && (
          <div className="ml-2 pointer-events-none flex-shrink-0">
            {renderRightIcon}
          </div>
        )}
        {postfix && <div className="ltr:ml-2 rtl:mr-2 flex-shrink-0">{postfix}</div>}
      </div>
    );

    const content = (
      <>
        {(title || label) && (
          // `block` is load-bearing: <label> is display:inline, where
          // margin-bottom is ignored. It only appeared to work because the
          // default wrapper is `flex flex-col` — with `removeWrapper` the
          // parent is caller-supplied and the gap silently vanished.
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-foreground"
          >
            {title || label}
          </label>
        )}
        {inputElement}
        {description && (
          <p id={descriptionId} className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        )}
        {hasError && errorMsg && (
          // `role="alert"` so the failure is announced when it appears — a red
          // border is not perceivable to a screen-reader user.
          <p
            id={errorId}
            role="alert"
            className="text-destructive text-sm mt-1 leading-normal"
          >
            {errorMsg}
          </p>
        )}
      </>
    );

    return removeWrapper ? (
      content
    ) : (
      <div className="flex-1 min-w-0 w-full flex flex-col">{content}</div>
    );
  }
);

Input.displayName = "Input";
export { Input };
