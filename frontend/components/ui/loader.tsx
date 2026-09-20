import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/**
 * Loader — a shape wrapper over <Spinner>, kept for its 16 existing call sites
 * (all `finance/*`).
 *
 * It used to be an independent CSS border-ring spinner locked to
 * `border-primary`, while `loading-spinner.tsx` was a lucide icon inheriting
 * `currentColor` — two primitives, two shapes, two colour policies, two export
 * styles, zero shared consumers. Both now delegate, so the product has one
 * spinner.
 *
 * Its `md` step also used `border-3`, which is not a stock Tailwind border
 * width and therefore emitted nothing — the ring was 0px wide at the default
 * size, i.e. invisible.
 */
interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Loader({ size = "md", className }: LoaderProps) {
  return <Spinner size={size} className={cn("text-primary", className)} />;
}
