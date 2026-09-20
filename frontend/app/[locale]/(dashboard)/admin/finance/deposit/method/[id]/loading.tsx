"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Percent,
  Power,
} from "lucide-react";

import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroSection } from "@/components/ui/hero-section";
import { SkeletonText } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";

/**
 * Pending state for /admin/finance/deposit/method/[id].
 *
 * WHAT DRIFTED
 * ------------
 * This file described a page that no longer exists — and, on the clearance
 * axis, one that never did.
 *
 *  - ROOT: `min-h-screen pt-20 pb-24` against the page's bare fragment. The
 *    page has NO root element and no clearance of its own: the hero owns the
 *    top of the document. So the 5rem here was 5rem of nothing, pushing the
 *    whole document down by that much and then snapping back.
 *  - HERO: a `min-h-[60vh]` full-bleed `from-primary/90` gradient band with a
 *    glass "Fee Overview" panel inside it. The page renders `HeroSection` at
 *    `pt-[calc(var(--header-height)+1rem)] pb-6`, no border, on the page
 *    ground. At a 900px viewport that is a ~540px band against roughly 300px
 *    — the single largest measured mismatch in the sweep, ~240px of vertical
 *    jump before a single card was reached.
 *  - BODY: `container mx-auto flex flex-col gap-6` against the page's
 *    `container mx-auto pt-6 pb-8 space-y-6` wrapping a `flex flex-col gap-6`.
 *    Both gutters and the 1.5rem/2rem block padding were missing.
 *  - Three admin action buttons where the page renders two.
 *  - A "Custom Fields" card with three placeholder tiles. That card is gated
 *    on `method.customFields.length > 0` and therefore renders for NO method
 *    while loading — it was reserving a section that always disappeared.
 *
 * THE FIX IS STRUCTURAL, NOT A STRING COPY
 * ----------------------------------------
 * The page's frame is `HeroSection`, which is a component, so this MOUNTS it
 * with the same props rather than re-describing it. Clearance, band padding,
 * orb geometry, the split layout and the bottom slot are then physically the
 * same code in both states; the literal `pt-20` could not have tracked
 * `--header-height` at all (see `lib/chrome/variants.ts`).
 *
 * `page.tsx` is already fully converted — it starts at `isLoading: true` and
 * threads that through `Loadable`/`StatsCard loading` — so this file is that
 * same tree with the values pending, and every string in it (`t()` calls, the
 * card titles, the fee labels) renders for real because all of them are known
 * before the request resolves.
 */
export default function DepositMethodLoading() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  return (
    <>
      <HeroSection
        /* The page falls back to this exact string until the record lands, so
           the `<h1>` box is identical in both states. */
        title={tCommon("payment_method")}
        titleClassName="text-3xl md:text-4xl"
        description={t("displayed_to_users_during_deposit")}
        descriptionClassName="text-base md:text-lg max-w-2xl"
        layout="split"
        maxWidth="max-w-full"
        /* Copied from the page because it is a PROP, not a container class —
           and it is itself derived from `--header-height`, so it tracks a
           taller navbar variant the way the old `pt-20` never could. */
        paddingTop="pt-[calc(var(--header-height)+1rem)]"
        paddingBottom="pb-6"
        titleLeftContent={
          <div className="relative">
            {/* The tile is a fixed 96/112px box in both states and a method
                with no logo gets this same glyph, so there is nothing here to
                reserve that is not already reserved. */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-primary/10 p-1 shadow-lg">
              <div className="w-full h-full rounded-xl overflow-hidden bg-background flex items-center justify-center">
                <CreditCard className="w-12 h-12 text-muted-foreground" />
              </div>
            </div>
            <Badge
              className="absolute -bottom-2 right-0 px-3 py-1 font-medium border shadow-sm bg-muted border-border"
              variant="default"
            >
              <SkeletonText placeholder="Inactive" />
            </Badge>
          </div>
        }
        rightContent={
          <Link href="/admin/finance/deposit/method">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("back_to_methods")}
            </Button>
          </Link>
        }
        rightContentAlign="start"
        stats={[
          { icon: DollarSign, label: tCommon("fixed_fee"), value: "$0.00" },
          { icon: Percent, label: tCommon("percentage_fee"), value: "0%" },
          { icon: ArrowDownCircle, label: tCommon("min_amount"), value: "$0" },
          { icon: ArrowUpCircle, label: tCommon("max_amount"), value: "∞" },
        ]}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 px-2.5 py-1">
            ID <SkeletonText placeholder="a1b2c3d4" />
            ...
          </Badge>
        </div>
      </HeroSection>

      <div className="container mx-auto pt-6 pb-8 space-y-6">
        <div className="flex flex-col gap-6">
          {/* Admin actions. Two buttons, matching the page; the enable/disable
              pair is one button whose copy depends on `status`, and the page
              shows the ENABLE face while `method` is null. */}
          <Card>
            <CardHeader>
              <CardTitle>{tCommon("admin_actions")}</CardTitle>
              <CardDescription>{t("manage_this_deposit_method")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-success hover:bg-success" disabled>
                  <Power className="h-4 w-4 mr-2" />
                  {t("enable_method")}
                </Button>
                <Button variant="destructive" disabled>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {tCommon("delete_method")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fee breakdown. Every label, icon tile and hint below is a `t()`
              call — none of it needs the network — so only the four figures
              are pending, and each placeholder sits INSIDE the same
              `text-2xl leading-tight` element the real figure will use. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>{tCommon("fee_breakdown")}</span>
                <Badge variant="outline" className="ml-2">
                  {tCommon("live")}
                </Badge>
              </CardTitle>
              <CardDescription>
                {t("detailed_fee_structure_for_this_payment_method")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <DollarSign className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {tCommon("fixed_fee")}
                        </p>
                        <p className="text-[11px] text-subtle-foreground">
                          {t("charged_per_transaction")}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <SkeletonText placeholder="$1.50" />
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <Percent className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {tCommon("percentage_fee")}
                        </p>
                        <p className="text-[11px] text-subtle-foreground">
                          {t("of_deposit_amount")}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <SkeletonText placeholder="2.5%" />
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <ArrowDownCircle className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {tCommon("minimum_deposit")}
                        </p>
                        <p className="text-[11px] text-subtle-foreground">
                          {t("lowest_allowed_amount")}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <SkeletonText placeholder="$10.00" />
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("maximum_deposit")}
                        </p>
                        <p className="text-[11px] text-subtle-foreground">
                          {t("highest_allowed_amount")}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                      <SkeletonText placeholder="$50,000" />
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground border-t pt-4">
              {t("fees_calculated_automatically_during_deposit_process")}
            </CardFooter>
          </Card>

          {/* Instructions. The ruler contains SPACES for the reason spelled out
              in `page.tsx`: this paragraph is `whitespace-pre-wrap` with no
              `break-words`, so an unbreakable run of zeroes would push a
              horizontal scrollbar instead of wrapping. */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <div>
                  <CardTitle>{tCommon("payment_instructions")}</CardTitle>
                  <CardDescription>
                    {t("displayed_to_users_during_deposit")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                  <SkeletonText
                    placeholder={
                      t("transfer_the_exact_amount_shown_to") +
                      t("your_payment_receipt_so_an_operator") +
                      t("wallet")
                    }
                  />
                </p>
              </div>
            </CardContent>
          </Card>

          {/* No custom-fields card: it is gated on a non-empty array, so the
              page never renders it while `method` is null. Reserving it here
              was reserving a block guaranteed to vanish. */}

          <ActivityTimeline
            title={tCommon("activity_timeline")}
            description={t("history_of_method_changes")}
            titleIcon={Clock}
            emptyMessage={`${tCommon("loading")}...`}
            events={[]}
          />
        </div>
      </div>
    </>
  );
}
