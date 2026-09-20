import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge, type BadgeAppearance } from "@/components/ui/badge";
import { STATUS_TONE, statusLabel, statusTone } from "@/lib/status-tone";

/**
 * The one status pill.
 *
 * Replaces 239 hand-written status->colour mappers (125 distinct helper names,
 * 43 statuses, 168 distinct class strings). See `lib/status-tone.ts` for how
 * the conflicting hues were resolved.
 *
 * Colour is never the only signal (DESIGN-SYSTEM.md R2): the pill always
 * carries a text label, and callers may pass an icon.
 */
export interface StatusBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, "tone" | "variant" | "children"> {
  /** Raw backend status — casing and separators are normalised for you. */
  status?: string | null;
  /** Override the rendered text. Defaults to the humanised status. */
  label?: React.ReactNode;
  /** `soft` (default) is the tonal chip; `solid` for high-emphasis rows. */
  appearance?: BadgeAppearance;
  icon?: React.ReactNode;
}

const StatusBadge = ({
  status,
  label,
  appearance = "soft",
  icon,
  className,
  ...props
}: StatusBadgeProps) => (
  <Badge
    tone={statusTone(status)}
    appearance={appearance}
    className={cn(className)}
    {...props}
  >
    {icon}
    {label ?? statusLabel(status)}
  </Badge>
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge, STATUS_TONE, statusTone, statusLabel };
