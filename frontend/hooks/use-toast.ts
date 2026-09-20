"use client";

import { toast as sonner } from "sonner";
import type * as React from "react";

/**
 * `useToast` — an adapter onto sonner.
 *
 * WHAT WAS BROKEN (measured 2026-07-29): this module used to be a self-contained
 * Radix toast store whose queue was rendered by `components/ui/toaster.tsx`.
 * That `<Toaster />` was mounted in exactly TWO places — `admin/builder/page.tsx`
 * and `admin/builder/[id]/page.tsx` — while 74 files and 361 `toast()` calls
 * relied on it. Everywhere else the call dispatched into a store with no
 * renderer subscribed, so the toast silently never appeared.
 *
 * That covered the entire auth surface: `login/page.tsx`, `login-form`,
 * `register-form`, `reset-password-form`, `two-factor-form`,
 * `wallet-login-form`. A user submitting a bad 2FA code or an expired
 * verification link got no feedback at all.
 *
 * A second, independent bug made it wrong even on the two pages that DID work:
 * `components/ui/toast.tsx` declares its cva variant group as `color`, while
 * this module and every call site pass `variant`. The prop fell through to the
 * DOM and `color` stayed undefined, so all `variant: "destructive"` calls
 * rendered as a neutral grey toast.
 *
 * sonner is already mounted globally in `provider/providers.tsx` and is already
 * pointed at the design tokens (`components/ui/sonner.tsx`), so delegating here
 * fixes every call site at once without touching them, and leaves the platform
 * with ONE toast look instead of two.
 *
 * The old store's `TOAST_LIMIT = 1` is deliberately not reproduced — sonner
 * stacks, which is what the 166 files already calling sonner directly expect.
 */

export type ToastVariant =
  | "default"
  | "destructive"
  | "success"
  | "warning"
  | "info";

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
  /** Accepted and ignored — no call site passes one (verified 2026-07-29). */
  action?: unknown;
}

/** sonner takes the headline positionally and everything else as options. */
function emit({ title, description, variant = "default", duration }: ToastOptions) {
  const message = (title ?? description ?? "") as React.ReactNode;
  // If only `description` was supplied it has already been promoted to the
  // headline above, so passing it again would print the same line twice.
  const opts = {
    description: title ? (description as React.ReactNode) : undefined,
    duration,
  };

  switch (variant) {
    case "destructive":
      return sonner.error(message, opts);
    case "success":
      return sonner.success(message, opts);
    case "warning":
      return sonner.warning(message, opts);
    case "info":
      return sonner.info(message, opts);
    default:
      return sonner(message, opts);
  }
}

function toast(props: ToastOptions) {
  const id = emit(props);
  return {
    id,
    dismiss: () => sonner.dismiss(id),
    update: (next: ToastOptions) => {
      sonner.dismiss(id);
      return emit(next);
    },
  };
}

toast.default = (props: Omit<ToastOptions, "variant">) =>
  toast({ ...props, variant: "default" });
toast.destructive = (props: Omit<ToastOptions, "variant">) =>
  toast({ ...props, variant: "destructive" });
toast.success = (props: Omit<ToastOptions, "variant">) =>
  toast({ ...props, variant: "success" });
toast.warning = (props: Omit<ToastOptions, "variant">) =>
  toast({ ...props, variant: "warning" });
toast.info = (props: Omit<ToastOptions, "variant">) =>
  toast({ ...props, variant: "info" });

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonner.dismiss(toastId),
    /**
     * The old store exposed its queue so `ui/toaster.tsx` could render it.
     * sonner owns its own rendering, so there is no queue to expose. Kept as a
     * stable empty array so any leftover consumer maps over nothing instead of
     * crashing on `undefined`.
     */
    toasts: [] as const,
  };
}

export { useToast, toast };
