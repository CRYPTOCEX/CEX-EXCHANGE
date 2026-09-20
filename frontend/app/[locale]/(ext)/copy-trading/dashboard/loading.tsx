"use client";

import { Calendar, Crown, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Pending state for /copy-trading/dashboard.
 *
 * WAS: the page's gradient root turned into a `flex items-center
 * justify-center pt-20` box holding a pulsing Crown tile and the string
 * "Loading your dashboard…". It looked considered, and it is the same defect as
 * a bare spinner: a branded splash reserves nothing. The whole hero — a 112px
 * avatar, a `text-3xl md:text-4xl` name, three badges, two meta lines and the
 * action buttons — landed as shift.
 *
 * The clearance was wrong as well. The settled hero is `pt-24 pb-8` (6rem);
 * this file said `pt-20` (5rem) and then threw it away by centring vertically,
 * so the splash sat roughly half a viewport below where the page starts.
 *
 * Also note the container: the settled hero uses `container mx-auto relative`
 * with NO horizontal padding, and the body below uses `container mx-auto`
 * likewise. The old file had no container at all.
 *
 * NOW: the page's hero and stats frame with the values pending. The avatar and
 * the Crown badge carry the page's own sizing strings (`h-24 w-24 md:h-28
 * md:w-28`, `w-10 h-10 ... -bottom-2 -right-2`), and the display name is
 * measured inside the real heading element rather than by a hand-picked `h-10`.
 *
 * `client.tsx` renders this file for its own `isLoading` branch.
 */
export default function DashboardLoading() {
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30 overflow-hidden">
      <div className="relative overflow-hidden border-b border-border/50 pt-24 pb-8">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />

        <div className="container mx-auto relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-4 ring-card shadow-2xl relative">
                  <AvatarFallback className="bg-muted animate-pulse" />
                </Avatar>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-warning rounded-xl flex items-center justify-center ring-4 ring-card shadow-lg">
                  <Crown className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    <SkeletonText placeholder={tExt("display_name")} />
                  </h1>
                  <Skeleton className="h-7 w-24 rounded-full" />
                </div>

                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <Skeleton className="h-7 w-28 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                </div>

                {/* Both meta lines carry static labels; only the two figures
                    wait, and they wait inside their own spans. */}
                <div className="flex items-center gap-4 text-sm text-subtle-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <SkeletonText placeholder="000" /> {tCommon("days_active")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    ID <SkeletonText placeholder="00000000" />
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                <SkeletonText placeholder={tExt("total_followers")} />
              </p>
              <p className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums">
                <SkeletonText placeholder="0,000" />
              </p>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </Card>
      </div>
    </div>
  );
}
