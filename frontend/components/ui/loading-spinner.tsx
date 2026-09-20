import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/**
 * LoadingSpinner — a centring wrapper over <Spinner>, kept for its 9 existing
 * call sites (all `(ext)/nft/*`). See `spinner.tsx` for why there were two
 * unrelated spinner primitives in the first place.
 *
 * Default export is preserved because that is how the nft tree imports it.
 */
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Spinner size={size} />
    </div>
  );
}
