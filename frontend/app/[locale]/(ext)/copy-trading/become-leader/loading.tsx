"use client";

import { ArrowLeft, Crown, DollarSign, Settings2, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Pending state for /copy-trading/become-leader.
 *
 * WAS: `flex items-center justify-center min-h-screen pt-20` around an
 * `h-8 w-8` spinner. This page is the extreme case of the "spinner standing in
 * for a page" defect, because the page is almost ENTIRELY static: the back
 * link, the Crown badge, the `text-4xl md:text-5xl` headline, the sub-heading,
 * the three benefit cards and every form section header are literals or `t()`
 * calls. Only the list of enabled trading types and the visitor's existing
 * leader profile come from the network. The spinner greyed out a page that
 * could have painted ~90% of itself immediately.
 *
 * The frame was wrong too: the settled root is `bg-muted/30` wrapping
 * `container mx-auto px-4 py-8 max-w-4xl pt-20`. The old file kept the `pt-20`
 * (correct, unusually — this route really does hardcode it) but dropped the
 * `max-w-4xl`, so the spinner centred on the full viewport while the page
 * centres inside a 56rem column.
 *
 * NOW: the real page down to the form, with only the trading-type radio cards
 * pending. `client.tsx` renders this file as its own `isLoading` branch, which
 * is why it is a client component and reads the same translation namespaces.
 */
export default function BecomeLeaderLoading() {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");

  const benefits = [
    { icon: Users, title: t("build_following"), desc: "Attract traders who want to copy your strategies" },
    { icon: DollarSign, title: t("earn_commission"), desc: "Get paid when your followers make profits" },
    { icon: Trophy, title: t("gain_recognition"), desc: "Build your reputation as a top trader" },
  ];

  return (
    <div className="bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl pt-20">
        {/* Back link — static, and it is the first thing on the page, so its
            absence pushed everything below it up by 40px. */}
        <span className="inline-flex items-center text-sm text-muted-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back_to_copy_trading")}
        </span>

        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-warning/10 border border-warning/20 dark:border-warning/30 mb-6">
            <Crown className="w-4 h-4 text-warning mr-2" />
            <span className="text-sm font-semibold text-warning">
              {t("become_a_leader")}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("share_your_trading_expertise")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("help_others_profit_from_your_trades")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {benefits.map((item) => (
            <Card key={item.title} className="h-full">
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-warning flex items-center justify-center mx-auto mb-3">
                  <item.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-subtle-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                  <Settings2 className="h-3.5 w-3.5" />
                </span>
                {tExt("trading_type")}
              </h3>
              {/* The ONLY pending thing on this page above the fold: which
                  trading types the operator has enabled. Three cards in the
                  page's own `md:grid-cols-3`, sized like the real labels. */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 rounded-xl border-2 border-border"
                  >
                    <Skeleton className="mt-1 h-4 w-4 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
