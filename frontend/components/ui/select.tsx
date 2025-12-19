"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { useTranslations } from "next-intl";

//
// Default ShadCN Select components
//

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

//
// Extended SelectTrigger with extra features
//

export interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  /** Optional custom icon; if not provided, defaults to ChevronDownIcon */
  icon?: React.ReactNode;
  /** Optional title displayed above the trigger */
  title?: string;
  /** Optional description displayed below the trigger */
  description?: string;
  /** When true, applies error styling to the trigger */
  error?: boolean;
  /** An error message to display below the trigger (when error is true) */
  errorMessage?: string;
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(
  (
    {
      className,
      children,
      icon,
      title,
      description,
      error,
      errorMessage,
      ...props
    },
    ref
  ) => {
    const triggerClasses = cn(
      "border-input data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-2xs transition-[color,box-shadow] outline-hidden focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
      error && "border-2 border-red-500 focus:ring-red-500 focus:ring-2",
      className
    );

    const triggerElement = (
      <SelectPrimitive.Trigger
        ref={ref}
        data-slot="select-trigger"
        className={triggerClasses}
        {...props}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          {icon ? icon : <ChevronDownIcon className="size-4 opacity-50" />}
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    );

    if (title || description || (error && errorMessage)) {
      return (
        <div className="flex flex-col">
          {title && (
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              {title}
            </label>
          )}
          {triggerElement}
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          {error && errorMessage && (
            <p className="text-red-500 text-sm mt-1 leading-normal">
              {errorMessage}
            </p>
          )}
        </div>
      );
    }
    return triggerElement;
  }
);
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

//
// Default SelectContent and other components
//

// SelectContent with optional search functionality
function SelectContent({
  className,
  children,
  position = "popper",
  search = false,
  searchPlaceholder = "Search...",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  search?: boolean;
  searchPlaceholder?: string;
}) {
  const t = useTranslations("components");
  const [searchTerm, setSearchTerm] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus the search input when the dropdown opens
  React.useEffect(() => {
    if (search && inputRef.current) {
      // Small delay to ensure the dropdown is fully rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [search]);

  // Reset search term when dropdown closes
  React.useEffect(() => {
    return () => setSearchTerm("");
  }, []);

  // Filter children based on search term
  const filteredChildren = React.useMemo(() => {
    if (!search || !searchTerm) return children;

    const searchLower = searchTerm.toLowerCase();
    return React.Children.toArray(children).filter((child) => {
      if (!React.isValidElement(child)) return true;
      // Get the text content from SelectItem children
      const childProps = child.props as { children?: React.ReactNode };
      const childText = String(childProps.children || "").toLowerCase();
      return childText.includes(searchLower);
    });
  }, [children, search, searchTerm]);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        onWheel={(e) => e.stopPropagation()}
        {...props}
      >
        {search && (
          <div className="p-2 border-b sticky top-0 bg-popover">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
                onKeyDown={(e) => {
                  // Prevent the select from closing when typing
                  e.stopPropagation();
                }}
              />
            </div>
          </div>
        )}
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1 overflow-auto",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
            search && "max-h-60"
          )}
          onWheel={(e) => e.stopPropagation()}
        >
          {filteredChildren}
          {search && searchTerm && React.Children.count(filteredChildren) === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("no_results_found")}
            </div>
          )}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-sm font-medium", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 ltr:pr-8 ltr:pl-2 rtl:pl-8 rtl:pr-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="absolute ltr:right-2 rtl:left-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
