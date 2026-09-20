"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * THE SCRIM, AND WHY IT IS AN INLINE STYLE.
 *
 * This used to ask for `bg-overlay/[calc(0.8*var(--dialog-overlay-opacity))]`,
 * and **that class emits no CSS at all**. Measured in the running app with a
 * dialog open, `[data-slot="dialog-overlay"]` computed to `rgba(0, 0, 0, 0)`:
 * every Radix Dialog in the product opened with NO dimming, the page showing
 * through at full brightness behind it. Probed side by side in the same page,
 * `bg-overlay` and `bg-overlay/80` both paint; `bg-overlay/[0.8]` and the
 * `calc(var(…))` form both paint nothing — Tailwind will not build an arbitrary
 * alpha for this token, and there is no build error to notice.
 *
 * It went unseen for two reasons. On a dark page over a near-black ground the
 * absence of a scrim is easy to read as "the scrim is subtle"; and the three
 * SIBLING overlays — `alert-dialog`, `sheet`, `drawer` — all spell it
 * `bg-overlay/80`, which works, so dialogs were the only surface affected.
 * It also silently disabled the admin design panel's "Scrim strength" control,
 * whose whole job is this one declaration.
 *
 * The inline style is not a workaround for a missing utility — it is the only
 * form that can carry a live token INTO the alpha slot. `calc()` there is
 * resolved by the browser at paint time, so the knob keeps working:
 * `hsl(var(--overlay) / calc(0.8 * var(--dialog-overlay-opacity)))` computes to
 * `rgba(6, 8, 12, 0.8)` at the default of 1, which is the 80% the original
 * class intended. Colour stays `--overlay` (dark in both themes on purpose);
 * the token still only says how much of the page is hidden.
 *
 * `className` still wins if a caller passes a background, because the inline
 * style is applied first and `props` spread after it.
 */
function DialogOverlay({
  className,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50",
        className
      )}
      style={{
        backgroundColor:
          "hsl(var(--overlay) / calc(0.8 * var(--dialog-overlay-opacity, 1)))",
        ...style,
      }}
      {...props}
    />
  );
}

interface DialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /**
   * Size variants for the dialog.
   * @default "md"
   */
  size?:
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl";
  /**
   * Hide the default close button.
   * @default false
   */
  hideCloseButton?: boolean;
}

function DialogContent({
  className,
  children,
  size = "md",
  hideCloseButton = false,
  ...props
}: DialogContentProps) {
  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
    "5xl": "sm:max-w-5xl",
    "6xl": "sm:max-w-6xl",
    "7xl": "sm:max-w-7xl",
  };

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-[var(--dialog-padding)] shadow-lg duration-200",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-md opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
