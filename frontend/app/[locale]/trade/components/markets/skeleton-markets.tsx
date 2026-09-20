import { Star } from "lucide-react";
import { SkeletonText } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface SkeletonMarketsProps {
  count?: number;
  /**
   * Which row shape to reserve. A FUTURES row is three lines — symbol, then
   * volume + price, then change + funding rate — and a spot row is two. This
   * prop did not exist, so the futures market list reserved a two-line row for
   * a three-line one and every row jumped ~16px on arrival. The rail is a fixed
   * column beside the chart, so all of that movement lands inside it.
   */
  marketType?: "spot" | "eco" | "futures";
}

/**
 * Pending rows for the markets rail, built from `MarketItem`'s OWN geometry.
 *
 * WHAT WAS WRONG, IN PIXELS
 * -------------------------
 * The row was `px-2 py-1.5`; `MarketItem` is `px-2 py-2`. Four pixels per row
 * over the ten rows this renders by default is 40px of the list shifting the
 * moment the markets land — under the cursor, in a scroll container.
 *
 * The inner boxes were `h-3.5` and `h-2.5` bars inside `h-4` and `h-3` line
 * boxes: a hardcoded approximation of text, half a pixel-step off in both
 * places, and unable to follow a type change. They are now `SkeletonText`
 * inside those same line boxes, so the height is produced by the same text
 * layout that will run on the real value.
 */
export function SkeletonMarkets({
  count = 10,
  marketType = "spot",
}: SkeletonMarketsProps) {
  const t = useTranslations("trade_components");
  const isFutures = marketType === "futures";

  return (
    <>
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="flex items-center justify-between gap-2 border-b border-border px-2 py-2"
          >
            <div className="flex min-w-0 flex-1 items-center">
              {/* The star is a control, not data — it is present in both states
                  and it is what the row's left edge is measured from. */}
              <div className="mr-2 h-3 w-3 opacity-30">
                <Star className="h-3 w-3 text-muted-foreground/40" />
              </div>

              {isFutures ? (
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="mb-1 flex h-4 min-w-0 items-center gap-1 overflow-hidden text-xs">
                    <SkeletonText placeholder="BTC/USDT" />
                  </div>
                  <div className="mb-1 flex h-3 min-w-0 items-center justify-between gap-2 text-[10px]">
                    <SkeletonText placeholder={t("vol_0_0m")} />
                    <SkeletonText placeholder="00000.00" />
                  </div>
                  <div className="flex h-3 min-w-0 items-center justify-between gap-2 text-[10px]">
                    <SkeletonText placeholder="+0.00%" />
                    <SkeletonText placeholder="0.0000%" />
                  </div>
                </div>
              ) : (
                <div className="flex min-w-0 flex-col">
                  <div className="flex h-4 min-w-0 items-center gap-1 overflow-hidden text-xs">
                    <SkeletonText placeholder="BTC/USDT" />
                  </div>
                  <div className="mt-0.5 h-3 text-[10px]">
                    <SkeletonText placeholder={t("vol_0_0m")} />
                  </div>
                </div>
              )}
            </div>

            {!isFutures && (
              <div className="flex shrink-0 flex-col items-end">
                <div className="h-4 text-xs">
                  <SkeletonText placeholder="00000.00" />
                </div>
                <div className="mt-0.5 flex h-3 items-center justify-end space-x-2 text-[10px]">
                  <SkeletonText placeholder="+0.00%" />
                </div>
              </div>
            )}
          </div>
        ))}
    </>
  );
}
