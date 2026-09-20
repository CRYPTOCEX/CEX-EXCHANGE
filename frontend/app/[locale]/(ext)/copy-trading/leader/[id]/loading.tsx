"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Pending state for /copy-trading/leader/[id].
 *
 * WAS: `min-h-screen flex items-center justify-center pt-20` + a spinner. Two
 * separate errors on the clearance axis alone:
 *
 *   - the settled page uses `pt-header` on its hero banner, which resolves
 *     through `--spacing-header` → `--header-height` (4rem by default and
 *     overridden per chrome variant in `lib/chrome/variants.ts`). `pt-20` is
 *     5rem, hardcoded — 16px out on the default chrome and arbitrarily out on
 *     any variant;
 *   - the spinner ALSO centred vertically in a `min-h-screen` flex box, so it
 *     sat halfway down the viewport while the page paints from the top.
 *
 * And it reserved nothing: no hero banner, no 96px avatar, no badge row, no
 * stats strip, no tabs. 100% of the layout arrived as shift.
 *
 * NOW: the page's banner (`pt-header relative overflow-hidden border-b
 * border-border/50` → `container mx-auto px-4 relative py-8 md:py-12` →
 * `flex-col lg:flex-row lg:gap-8`) with the real back link, a real `Avatar` at
 * the page's `h-20 w-20 md:h-24 md:w-24`, and the display name measured inside
 * the real `text-2xl md:text-3xl` heading.
 *
 * `client.tsx` imports this file for its own `isLoading` branch.
 */
export default function LeaderDetailLoading() {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
      <div className="pt-header relative overflow-hidden border-b border-border/50">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-20 -left-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative py-8 md:py-12">
          <div className="flex flex-col lg:flex-row lg:gap-8">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center text-sm text-muted-foreground mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("back_to_leaders")}
              </span>

              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  {/* Same sizing string the page uses, so the column beside it
                      starts at the same y on the first frame. */}
                  <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-4 ring-card shadow-xl">
                    <AvatarFallback className="bg-muted animate-pulse" />
                  </Avatar>
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-success border-2 border-border rounded-full" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                      <SkeletonText placeholder={t("leader_display_name")} />
                    </h1>
                  </div>

                  {/* Badge row: three pills whose text is unknown but whose
                      BOX is not — reserving it is what keeps the bio below
                      from jumping. */}
                  <div className="flex items-center flex-wrap gap-2 mb-3">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>

                  <p className="text-sm text-muted-foreground max-w-xl">
                    <SkeletonText chars={80} />
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 lg:mt-0 lg:w-72 shrink-0 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                <SkeletonText placeholder={tCommon("total_profit")} />
              </p>
              <p className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums">
                <SkeletonText placeholder="0,000.00" />
              </p>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
