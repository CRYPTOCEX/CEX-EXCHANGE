"use client";

import { useTranslations } from "next-intl";
import {
  Clock,
  DollarSign,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeroSection } from "@/components/ui/hero-section";
import { SkeletonText } from "@/components/ui/skeleton";

/**
 * Pending state for /forex/dashboard.
 *
 * WHAT DRIFTED — the hero was re-drawn, and the page ended in a spinner
 * ---------------------------------------------------------------------
 * The ground was right. Above it:
 *
 *  - The hero was RE-DESCRIBED as `<div className="relative pt-24 pb-8">` with
 *    a hand-built badge pill, where the page mounts `HeroSection`. `pt-24` is
 *    6rem frozen; the hero's default is `pt-header-clear` = `--header-height` +
 *    2rem, equal to 6rem only while the navbar is the default 4rem bar and
 *    8.5rem on `stacked` (`lib/chrome/variants.ts`). Identical today, wrong
 *    the moment an owner changes the navbar — which is exactly why this task
 *    treats a matching literal as a defect.
 *  - Two decorative `absolute` orb divs were painted directly on the ROOT,
 *    which is not `relative`. They therefore positioned against the nearest
 *    positioned ancestor (the viewport) instead of the hero, so the pending
 *    glow sat somewhere the settled glow does not.
 *  - The welcome card was `rounded-2xl bg-success/20 p-8`; the page renders
 *    `Card` with `rounded-lg border border-border bg-success` and
 *    `CardContent p-8`. Different radius, different fill, and a missing
 *    hairline.
 *  - The four stat cards were `p-6` with a `w-12 h-12` icon tile and an
 *    `h-8` figure; the page uses `CardContent p-4` with an `h-7 w-7` tile and
 *    a `text-2xl leading-tight` figure. That is ~32px of extra height per card
 *    across a row — the largest measured shift on this route after the hero.
 *  - And after the whole page, a `py-16` block with a spinning `Loader2`: 112px
 *    of document with no counterpart on the page, so everything settled and
 *    then the page shrank.
 *
 * Mounting `HeroSection` removes the clearance, band-height and orb axes.
 * Every label below is a `t()` call, so only the figures wait.
 */
export default function DashboardLoading() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  const statsCards = [
    { title: tCommon("balance"), placeholder: "$0.00", icon: Wallet },
    { title: tCommon("total_invested"), placeholder: "$0.00", icon: DollarSign },
    { title: tCommon("total_profit"), placeholder: "$0.00", icon: TrendingUp },
    { title: tCommon("active_investments"), placeholder: "0", icon: Clock },
  ];

  return (
    /* The "ground was right" note above predates `WorkspaceGround`: the wash
       both files carried is opaque and covered the ground the hero mounts.
       Stripped here and in `client.tsx` together, so the skeleton and the
       settled page stand on the same thing. */
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Forex Trading",
        }}
        title={tExt("forex_dashboard")}
        titleClassName="text-3xl md:text-4xl"
        description={t("manage_your_investments_and_trading_accounts")}
        paddingBottom="pb-8"
        layout="split"
        rightContent={
          /* The deposit/withdraw pair is gated on `liveAccount`, so whether it
             exists at all is part of what the fetch answers. It is rendered
             here because it is the TALLER of the two outcomes: reserving it
             means the hero cannot grow when the account arrives, and both
             buttons carry their real labels. */
          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <Button
              size="lg"
              disabled
              className="w-full sm:w-48 bg-success text-success-foreground font-semibold rounded-xl shadow-lg"
            >
              <Wallet className="mr-2 h-5 w-5" />
              {tCommon("deposit")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled
              className="w-full sm:w-48 border-2 border-success text-success font-semibold rounded-xl shadow-lg"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              {tCommon("withdraw")}
            </Button>
          </div>
        }
      />

      <main className="pb-24">
        <div className="container mx-auto py-8">
          <div className="space-y-8">
            {/* Welcome card. Its heading is `"Welcome back, {firstName}!"` —
                the greeting is static and only the name waits. */}
            <Card className="relative overflow-hidden rounded-lg border border-border bg-success">
              <CardContent className="relative p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
                      {tCommon("welcome_back")},{" "}
                      <SkeletonText placeholder="Alex" />!
                    </h2>
                    <p className="text-primary-foreground/80 text-lg">
                      {t("your_portfolio_is")}{" "}
                      <SkeletonText placeholder={t("performing_well")} />
                    </p>
                  </div>
                  <Button
                    size="lg"
                    disabled
                    className="bg-card text-success font-semibold rounded-lg"
                  >
                    {tCommon("new_investment")}
                    <PlusCircle className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* The four stat cards, at the page's own `p-4` / `h-7 w-7` /
                `text-2xl leading-tight` geometry. Titles and icons are config;
                each figure's placeholder sits inside the real typography
                element, so its height is computed rather than guessed. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((stat) => (
                <Card
                  key={stat.title}
                  className="rounded-lg border border-border bg-card"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="truncate text-xs font-medium text-muted-foreground">
                        {stat.title}
                      </h3>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <stat.icon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                      <SkeletonText placeholder={stat.placeholder} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-subtle-foreground">
                      <SkeletonText placeholder={t("live_account")} />
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Accounts section. Whether this is the empty "creating your
                account" card or a grid of account tiles depends on
                `accounts.length`, which is what is being fetched — so the
                reserved shape is the account grid, the taller of the two. */}
            <Card className="rounded-lg border border-border bg-card overflow-hidden">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="bg-muted dark:bg-muted/50 rounded-xl p-6 border border-border"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2">
                          <p className="text-base font-semibold">
                            <SkeletonText placeholder={t("mt5_live")} />
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <SkeletonText placeholder="000000000" />
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4 mb-6">
                        {[0, 1, 2].map((row) => (
                          <div key={row} className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              <SkeletonText placeholder="Balance" />
                            </span>
                            <span className="text-sm font-medium font-mono tabular-nums">
                              <SkeletonText placeholder="$0.00" />
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" size="sm" disabled>
                          {tCommon("deposit")}
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                          {tCommon("withdraw")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
