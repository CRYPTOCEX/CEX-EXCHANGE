import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";

/* -------------------------------------------------------------------
  1) Define your CVA variants for individual breadcrumb items
  ------------------------------------------------------------------- */
const breadcrumbItemsVariants = cva(
  "flex gap-1 items-center transition underline-offset-4",
  {
    variants: {
      color: {
        default:
          "text-default-600 hover:text-default-600/80 data-[state=active]:text-primary aria-[current=page]:text-primary",
        primary:
          "text-primary/80 hover:text-primary/60 data-[state=active]:text-primary aria-[current=page]:text-primary",
        success:
          "text-success/80 hover:text-success/60 data-[state=active]:text-success aria-[current=page]:text-success",
        info: "text-info/80 hover:text-info/60 data-[state=active]:text-info aria-[current=page]:text-info",
        warning:
          "text-warning/80 hover:text-warning/60 data-[state=active]:text-warning aria-[current=page]:text-warning",
        destructive:
          "text-destructive/80 hover:text-destructive/60 data-[state=active]:text-destructive aria-[current=page]:text-destructive",
      },
      underline: {
        none: "no-underline",
        hover: "hover:underline",
        always: "underline",
        active: "active:underline",
        focus: "focus:underline",
      },
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      color: "default",
      size: "sm",
      underline: "none",
    },
  }
);

/* -------------------------------------------------------------------
  2) Define your CVA variants for the breadcrumbs container
  ------------------------------------------------------------------- */
const breadcrumbsVariants = cva("flex flex-wrap list-none max-w-fit", {
  variants: {
    variant: {
      default: "",
      solid: "bg-muted p-3 rounded",
      bordered: "border-2 border-border rounded p-3",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

/* -------------------------------------------------------------------
  3) Define an interface for any extra props on the child <BreadcrumbItem>
  ------------------------------------------------------------------- */
export interface BreadcrumbItemProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** True if this breadcrumb item is the last item in the list. */
  isLast?: boolean;
  /** True if this breadcrumb item is the current page (aria-current=page). */
  isCurrent?: boolean;
  /** Must match your CVA 'color' variant keys or be undefined. */
  color?:
    | "default"
    | "primary"
    | "success"
    | "info"
    | "warning"
    | "destructive";
  /** Must match your CVA 'size' variant keys or be undefined. */
  size?: "sm" | "md" | "lg";
  /** Must match your CVA 'underline' variant keys or be undefined. */
  underline?: "none" | "hover" | "always" | "active" | "focus";
  /** If you want to link somewhere, pass href. */
  href?: string;
  /** If true, item is visually and functionally disabled (unless isCurrent). */
  disabled?: boolean;
  /** Separator element (e.g. '>', '/'). */
  separator?: React.ReactNode;
  /** Optional icon or text to render before children. */
  startContent?: React.ReactNode;
  /** Optional icon or text to render after children (before separator). */
  endContent?: React.ReactNode;
  /** Optional callback, triggered if clicked and not isCurrent. */
  onAction?: (value: React.ReactNode) => void;
}

/* -------------------------------------------------------------------
  4) <BreadcrumbItem> component
  ------------------------------------------------------------------- */
export const BreadcrumbItem = React.forwardRef<
  HTMLSpanElement,
  BreadcrumbItemProps
>(
  (
    {
      className,
      children,
      isLast,
      isCurrent,
      color,
      size,
      href,
      underline,
      disabled,
      separator,
      startContent,
      endContent,
      onAction,
      ...props
    },
    ref
  ) => {
    const ariaCurrent = isCurrent ? "page" : undefined;
    const dataState = isCurrent ? "active" : undefined;
    // If it's disabled and not current, set data-disabled="true"
    const dataDisabled = disabled && !isCurrent ? "true" : undefined;

    const handleClick = () => {
      if (onAction && !isCurrent) {
        onAction(children);
      }
    };

    return (
      <li className="inline-flex items-center">
        <span
          ref={ref}
          className={cn(
            breadcrumbItemsVariants({ color, size, underline }),
            className,
            disabled && !isCurrent && "opacity-50 cursor-not-allowed"
          )}
          aria-current={ariaCurrent}
          data-state={dataState}
          data-disabled={dataDisabled}
          onClick={handleClick}
          {...props}
        >
          {startContent && <span>{startContent}</span>}

          {href ? <Link href={href}>{children}</Link> : children}

          {endContent && <span>{endContent}</span>}

          {/* Show separator if NOT last breadcrumb item */}
          {!isLast && separator && (
            <span className="separator px-1 cursor-default">{separator}</span>
          )}
        </span>
      </li>
    );
  }
);
BreadcrumbItem.displayName = "BreadcrumbItem";

/* -------------------------------------------------------------------
  5) The parent <Breadcrumbs> that arranges multiple <BreadcrumbItem> children
  ------------------------------------------------------------------- */
interface BreadcrumbsProps
  extends React.HTMLAttributes<HTMLOListElement>,
    VariantProps<typeof breadcrumbsVariants> {
  maxItems?: number;
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
  /** Node to render in place of collapsed items. Defaults to an ellipsis. */
  renderEllipsis?: React.ReactNode;
  /** Separator between breadcrumb items. */
  separator?: React.ReactNode;
  /** Extra classes for each <BreadcrumbItem>. */
  itemClasses?: string;
  /** Disables all but the last item. */
  disabled?: boolean;
  /** Must match your CVA variant (in breadcrumbsVariants). */
  variant?: "solid" | "default" | "bordered";
  /** Must match your underline variants if you pass them to each item. */
  underline?: "none" | "hover" | "always" | "active" | "focus";
  /** Must match your color variants if you pass them to each item. */
  color?:
    | "default"
    | "primary"
    | "success"
    | "info"
    | "warning"
    | "destructive";
  /** Must match your size variants if you pass them to each item. */
  size?: "sm" | "md" | "lg";
  /** Classes for the ellipsis container if used. */
  ellipsisClass?: string;
}

/* -------------------------------------------------------------------
  6) <Breadcrumbs> component
  ------------------------------------------------------------------- */
export const Breadcrumbs = React.forwardRef<HTMLOListElement, BreadcrumbsProps>(
  (
    {
      className,
      children,
      maxItems,
      itemsBeforeCollapse = 1,
      itemsAfterCollapse = 1,
      color,
      size,
      disabled,
      separator = (
        <Icon icon="heroicons:chevron-right" className="rtl:rotate-180" />
      ),
      variant,
      underline,
      renderEllipsis,
      ellipsisClass,
      itemClasses,
      ...props
    },
    ref
  ) => {
    // Convert the children to an array so we can slice/splice if needed
    const breadcrumbItems = React.Children.toArray(children);
    const totalItems = breadcrumbItems.length;

    /* Possibly collapse to show an ellipsis */
    let visibleItems: React.ReactNode[] = breadcrumbItems;
    if (maxItems && totalItems > maxItems) {
      const visibleBefore = Math.min(
        itemsBeforeCollapse,
        totalItems - itemsAfterCollapse
      );
      const visibleAfter = Math.min(
        itemsAfterCollapse,
        totalItems - visibleBefore
      );
      visibleItems = [
        // first chunk
        ...breadcrumbItems.slice(0, visibleBefore),
        // null as placeholder for the ellipsis
        null,
        // last chunk
        ...breadcrumbItems.slice(totalItems - visibleAfter),
      ];
    }

    return (
      <ol
        ref={ref}
        className={cn(breadcrumbsVariants({ variant }), className)}
        {...props}
      >
        {visibleItems.map((child, index) => {
          // If child is the ellipsis placeholder
          if (child === null) {
            return (
              <li
                key={`breadcrumb-ellipsis-${index}`}
                className="flex items-center"
              >
                {renderEllipsis ? (
                  <div
                    className={cn(
                      "flex gap-1 text-default-600 items-center",
                      ellipsisClass
                    )}
                  >
                    {renderEllipsis}
                    <span className="separator px-1 self-center">
                      {separator || <Icon icon="heroicons:chevron-right" />}
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex gap-1 text-default-600 text-base",
                      ellipsisClass
                    )}
                  >
                    <Icon icon="heroicons:ellipsis-horizontal" />
                    <span className="separator px-1 self-center">
                      {separator || <Icon icon="heroicons:chevron-right" />}
                    </span>
                  </div>
                )}
              </li>
            );
          }

          // If child is not null, treat it as a React element with <BreadcrumbItemProps>
          const element = child as React.ReactElement<BreadcrumbItemProps>;
          const isLast = index === visibleItems.length - 1;

          // If the child is not a valid React element, skip it.
          if (!element) {
            return null;
          }

          // If the item already has isCurrent, we honor that; otherwise we set it if last
          const isCurrent = element.props.isCurrent ?? isLast;

          return React.cloneElement(element, {
            ...element.props,
            isLast, // new prop
            isCurrent, // new prop
            disabled: disabled && !isLast,
            separator,
            color,
            size,
            underline,
            className: cn(
              breadcrumbItemsVariants({ color, size, underline }),
              element.props.className,
              itemClasses
            ),
          });
        })}
      </ol>
    );
  }
);
Breadcrumbs.displayName = "Breadcrumbs";
