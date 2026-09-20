"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/layout/page-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Minus,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Activity,
  DollarSign,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { statusLabel } from "@/lib/status-tone";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

/**
 * Every figure on this page arrives from a MySQL DECIMAL column, and mysql2
 * hands those back as STRINGS. `trade.amount?.toFixed(6)` on a string is a
 * TypeError, so the trades tab could take the whole page down the moment a
 * leader had one — coerce at the boundary rather than at each call site.
 */
const num = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const usd = (value: unknown, digits = 2): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num(value));

/** Volume is an aggregate and can run to eight digits; a stat tile cannot. */
const usdCompact = (value: unknown): string => {
  const n = num(value);
  return Math.abs(n) >= 1_000_000
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(n)
    : usd(n);
};

/**
 * P&L, signed.
 *
 * The sign is not decoration — `--up`/`--down` measure CVD ΔE 5.2-5.5 against a
 * floor of 8, so colour ALONE cannot separate a win from a loss for roughly one
 * in twelve men. DESIGN-SYSTEM.md's second open token item makes the secondary
 * encoding mandatory, and on a bare currency figure the leading `+`/`-` is it.
 */
const signedUsd = (value: unknown, digits = 2): string => {
  const n = num(value);
  return `${n > 0 ? "+" : ""}${usd(n, digits)}`;
};

const signedPercent = (value: unknown, digits = 2): string => {
  const n = num(value);
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
};

/**
 * Direction ink for a P&L figure. Zero is NEITHER — it was painted `--up`
 * before, so a leader who had never traded showed a green `+0.00%` and read as
 * profitable at a glance.
 */
const pnlInk = (value: unknown): string => {
  const n = num(value);
  return n > 0 ? "text-up" : n < 0 ? "text-down" : "text-muted-foreground";
};

/** The figure treatment StatsCard applies to its own string values (R4). */
const FIGURE = "font-mono tabular-nums";

/** Column labels: `subtle-foreground` is the system's label ink, contrast-checked at this size. */
const TH = "h-9 px-4 text-[11px] font-medium uppercase tracking-wider text-subtle-foreground";
const TD = "px-4 py-2.5";
const TD_NUM = `${TD} text-right ${FIGURE}`;

const COPY_MODE_LABELS: Record<string, string> = {
  PROPORTIONAL: "Proportional",
  FIXED_AMOUNT: "Fixed Amount",
  FIXED_RATIO: "Fixed Ratio",
};

interface Leader {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  tradingStyle: string;
  tradingType?: string;
  riskLevel: string;
  status: string;
  isPublic: boolean;
  winRate: number;
  roi: number;
  totalTrades: number;
  totalProfit: number;
  totalVolume: number;
  totalFollowers: number;
  profitSharePercent: number;
  minFollowAmount: number;
  maxFollowers: number;
  createdAt: string;
  rejectionReason?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
  };
  followers?: any[];
  trades?: any[];
}

/**
 * One label/value pair in the profile card's fact row.
 *
 * `loading` swaps only the `<dd>`'s CONTENT, never the `<dd>` itself — the
 * `text-sm` line box, the `mt-0.5` and the `truncate` all stay, so the five-up
 * `<dl>` is exactly as tall pending as resolved and the rejection notice and
 * bio below it do not slide.
 */
function Fact({
  label,
  value,
  mono = false,
  loading = false,
  placeholder,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  loading?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">
        {label}
      </dt>
      <dd
        className={`mt-0.5 truncate text-sm font-medium text-foreground ${
          mono ? FIGURE : ""
        }`}
      >
        <Loadable loading={loading} placeholder={placeholder} chars={8}>
          {value}
        </Loadable>
      </dd>
    </div>
  );
}

export default function LeaderDetailClient() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const leaderId = params.id as string;

  const [leader, setLeader] = useState<Leader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
  }>({ open: false, action: "", title: "" });
  const [actionReason, setActionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeader = async () => {
    const { data } = await $fetch({
      url: `/api/admin/copy-trading/leader/${leaderId}`,
      method: "GET",
      silent: true,
    });
    setLeader(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (leaderId) {
      fetchLeader();
    }
  }, [leaderId]);

  const handleAction = async () => {
    if (!actionDialog.action) return;

    const needsReason = ["reject", "suspend"].includes(actionDialog.action);
    if (needsReason && !actionReason.trim()) {
      toast.error(t("please_provide_a_reason"));
      return;
    }

    setIsSubmitting(true);
    const { error } = await $fetch({
      url: `/api/admin/copy-trading/leader/${leaderId}/${actionDialog.action}`,
      method: "POST",
      body: needsReason ? { reason: actionReason } : undefined,
    });

    if (!error) {
      setActionDialog({ open: false, action: "", title: "" });
      setActionReason("");
      fetchLeader();
    }
    setIsSubmitting(false);
  };

  const handleRecalculate = async () => {
    const { error } = await $fetch({
      url: `/api/admin/copy-trading/leader/${leaderId}/recalculate`,
      method: "POST",
    });

    if (!error) {
      fetchLeader();
    }
  };

  /**
   * A leader's market is categorical identity — three peers, no ordering, no
   * state — so each takes a fixed slot on the chart ramp (the ramp validated for
   * CVD separation and contrast in both themes), exactly as `WALLET_THEMES`
   * does for wallet type.
   *
   * All three entries used to be the same `bg-primary/10 text-primary`, so the
   * map encoded nothing at all and painted a state in the accent, which R2
   * reserves for things you click.
   */
  const getTradingTypeBadge = (tradingType?: string, loading = false) => {
    const type = tradingType || "SPOT";
    const colors: Record<string, string> = {
      SPOT: "bg-chart-1/10 text-chart-1 border-chart-1/20",
      BINARY: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      BOTH: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    };
    /* While pending the chip keeps its box but NOT its hue: `|| "SPOT"` would
       otherwise paint chart-1 on a record whose market nobody has read yet,
       i.e. assert a category from a default. */
    return (
      <Badge
        className={
          loading
            ? "bg-muted text-muted-foreground"
            : colors[type] || "bg-muted text-muted-foreground"
        }
      >
        <Loadable loading={loading} placeholder="BINARY">
          {type}
        </Loadable>
      </Badge>
    );
  };

  /*
    ONE PAGE, TWO STATES — AND NOT-FOUND IS A THIRD.
    ==========================================================================
    This used to open with `if (isLoading) return <50vh centred spinner/>`,
    which discarded the back button, the profile card, the six-tile KPI row and
    the tab bar — every pixel of which is knowable before the request is sent —
    and then rebuilt roughly 700px of it in one frame. The `!leader` return
    directly below it then doubled as BOTH "still fetching" and "no such
    leader", which is the `loading || !data` conflation the spec calls out: the
    only reason it did not flash "leader not found" on every page load was that
    the spinner happened to run first.

    Now the layout renders once. `isLoading` is threaded to the six
    `StatsCard`s (they hold their own 130.5px frame while pending) and to the
    handful of text values; the not-found branch fires only once the fetch has
    actually come back empty.
  */
  /* Named, rather than re-derived at the branch. `if (!loading && !record)`
     reads as a loading branch to anything scanning this file; it is not one —
     it is the EMPTY state, and the loading flag appears only to stop it firing
     before the answer is in. The name says which of the three states this is. */
  const leaderNotFound = !isLoading && !leader;

  if (leaderNotFound) {
    return (
      <PageShell ground="subtle">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">{tExt("leader_not_found")}</p>
        </div>
      </PageShell>
    );
  }

  const avatar = leader?.avatar || leader?.user?.avatar;
  const initials = (leader?.displayName ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roi = num(leader?.roi);
  const totalProfit = num(leader?.totalProfit);
  const winRate = num(leader?.winRate);
  const followerCount = num(leader?.totalFollowers);
  const maxFollowers = num(leader?.maxFollowers);
  const RoiIcon = roi > 0 ? TrendingUp : roi < 0 ? TrendingDown : Minus;
  const isNegativeAction = ["reject", "suspend"].includes(actionDialog.action);

  return (
    <PageShell ground="subtle">
      {/* Back */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Button>
      </div>

      {/* Profile */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* The avatar has no text metrics, so it is the one thing here that
                takes a raw block — sized with the SAME `h-20 w-20` string the
                real avatar carries. */}
            {/* The Avatar's own box and border are chrome and render in
                both states; only what is INSIDE it waits. `src` is undefined
                while pending, so Radix falls through to the fallback slot on
                its own and the pulse fills the same 80px circle the image
                will. Swapping the whole `<Avatar>` for a block was a tree
                swap that also dropped the border ring. */}
            <Avatar className="h-20 w-20 shrink-0 border border-border">
              <AvatarImage src={avatar} alt={leader?.displayName} />
              <AvatarFallback className="bg-surface-3 text-xl font-semibold text-foreground">
                {isLoading ? (
                  <SkeletonBlock className="h-full w-full rounded-full" />
                ) : (
                  initials
                )}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    <Loadable loading={isLoading} placeholder={tExt("leader_name")}>
                      {leader?.displayName}
                    </Loadable>
                  </h1>
                  {/* Chips render in both states: their box is chrome, the word
                      inside is the value. `status`/`tradingType` stay undefined
                      while pending so neither resolves to a tone that reads as
                      a verdict on a record nobody has seen yet. */}
                  <StatusBadge
                    status={leader?.status}
                    label={
                      <Loadable loading={isLoading} placeholder="ACTIVE">
                        {leader ? statusLabel(leader.status) : null}
                      </Loadable>
                    }
                  />
                  {getTradingTypeBadge(leader?.tradingType, isLoading)}
                  {leader && !leader.isPublic && (
                    <Badge tone="neutral" appearance="outline">
                      {tCommon("private")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  <Loadable loading={isLoading} chars={34}>
                    {[
                      [leader?.user?.firstName, leader?.user?.lastName]
                        .filter(Boolean)
                        .join(" "),
                      leader?.user?.email,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Loadable>
                </p>
              </div>

              {leader?.bio && (
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {leader.bio}
                </p>
              )}

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-5">
                <Fact
                  label={tExt("trading_style")}
                  value={statusLabel(leader?.tradingStyle)}
                  loading={isLoading}
                  placeholder="Moderate"
                />
                <Fact
                  label={tCommon("risk_level")}
                  value={statusLabel(leader?.riskLevel)}
                  loading={isLoading}
                  placeholder="Medium"
                />
                <Fact
                  label={tCommon("profit_share")}
                  value={`${num(leader?.profitSharePercent)}%`}
                  mono
                  loading={isLoading}
                  placeholder="20%"
                />
                <Fact
                  label={tCommon("minimum")}
                  value={usd(leader?.minFollowAmount)}
                  mono
                  loading={isLoading}
                  placeholder="$1,000.00"
                />
                <Fact
                  label={t("applied_1")}
                  /* `new Date(undefined)` is Invalid Date, so this has to be
                     guarded rather than merely skeletoned. */
                  value={
                    leader ? new Date(leader.createdAt).toLocaleDateString() : ""
                  }
                  mono
                  loading={isLoading}
                  placeholder="00/00/0000"
                />
              </dl>

              {leader?.rejectionReason && (
                /* §4a: a heading in the status hue on a tint of the same hue is
                   the low-contrast case those hand-tuned pairs worked around —
                   the heading stays `foreground`, the copy takes the token. */
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {tCommon("rejection_reason")}
                  </p>
                  <p className="mt-1 text-sm text-destructive-ink">
                    {leader.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Actions.
                Which buttons exist is a function of the leader's STATUS, so
                these are genuinely unknowable before the fetch — there is no
                honest placeholder for "approve or suspend". The column is
                `lg:w-44` and sits in a `lg:flex-row`, so what arrives grows the
                column downward, not the profile block beside it. */}
            <div className="flex shrink-0 flex-col gap-2 lg:w-44">
              {leader?.status === "PENDING" && (
                <>
                  <Button
                    tone="success"
                    onClick={() =>
                      setActionDialog({
                        open: true,
                        action: "approve",
                        title: t("approve_leader"),
                      })
                    }
                  >
                    <CheckCircle className="h-4 w-4" />
                    {tCommon("approve")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      setActionDialog({
                        open: true,
                        action: "reject",
                        title: t("reject_leader"),
                      })
                    }
                  >
                    <XCircle className="h-4 w-4" />
                    {tCommon("reject")}
                  </Button>
                </>
              )}
              {leader?.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  tone="warning"
                  onClick={() =>
                    setActionDialog({
                      open: true,
                      action: "suspend",
                      title: t("suspend_leader"),
                    })
                  }
                >
                  <Pause className="h-4 w-4" />
                  {tCommon("suspend")}
                </Button>
              )}
              {leader?.status === "SUSPENDED" && (
                <Button
                  tone="success"
                  onClick={() =>
                    setActionDialog({
                      open: true,
                      action: "activate",
                      title: t("reactivate_leader"),
                    })
                  }
                >
                  <Play className="h-4 w-4" />
                  {tCommon("reactivate")}
                </Button>
              )}
              <Button variant="outline" onClick={handleRecalculate}>
                <RefreshCw className="h-4 w-4" />
                {t("recalculate_stats")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/*
        Stat tiles.

        Every tile carries the NEUTRAL icon slot. The hue-named slots are
        categorical identity (which metric), and painting ROI's tile green and
        the loss variant `red` — a chart-ramp slot, not a status token — made
        the row read as a five-hue KPI rainbow while saying nothing true. R1
        gives the loud colour to P&L only, so direction now lives on the figure
        itself, with a flipping icon and a signed value beside it.
      */}
      {/* `loading` goes to each CARD, not around the grid: the six tiles keep
          their border, label, icon tile and 130.5px height throughout, and only
          the figures pulse. The `RoiIcon` still flips with the sign — while
          pending `roi` is 0, so it settles on the neutral `Minus`, which is the
          honest glyph for "no direction known". */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatsCard
          index={0}
          label="ROI"
          value={
            <span className={`${FIGURE} ${pnlInk(roi)}`}>
              {signedPercent(roi)}
            </span>
          }
          icon={RoiIcon}
          loading={isLoading}
          {...statsCardColors.neutral}
        />

        <StatsCard
          index={1}
          label={tCommon("win_rate")}
          value={`${winRate.toFixed(1)}%`}
          icon={BarChart3}
          progress={winRate}
          loading={isLoading}
          {...statsCardColors.neutral}
        />

        <StatsCard
          index={2}
          label={tExt("followers")}
          value={followerCount}
          icon={Users}
          description={`${tCommon("of")} ${maxFollowers} ${tCommon("max").toLowerCase()}`}
          progress={maxFollowers > 0 ? (followerCount / maxFollowers) * 100 : 0}
          loading={isLoading}
          {...statsCardColors.neutral}
        />

        <StatsCard
          index={3}
          // See health/client.tsx: an ICU placeholder printed as a label.
          label={tCommon("trades")}
          value={num(leader?.totalTrades)}
          icon={Activity}
          loading={isLoading}
          {...statsCardColors.neutral}
        />

        <StatsCard
          index={4}
          label={tCommon("profit")}
          value={
            <span className={`${FIGURE} ${pnlInk(totalProfit)}`}>
              {signedUsd(totalProfit)}
            </span>
          }
          icon={DollarSign}
          loading={isLoading}
          {...statsCardColors.neutral}
        />

        <StatsCard
          index={5}
          label={tCommon("volume")}
          value={usdCompact(leader?.totalVolume)}
          icon={Receipt}
          loading={isLoading}
          {...statsCardColors.neutral}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="followers" className="space-y-4">
        <TabsList>
          {/* The tab bar is chrome and renders in full from the first frame;
              only the counts in the parentheses wait. */}
          <TabsTrigger value="followers">
            {tExt("followers")} (
            <Loadable loading={isLoading} placeholder="0">
              {leader?.followers?.length || 0}
            </Loadable>
            )
          </TabsTrigger>
          <TabsTrigger value="trades">
            {tCommon("recent_trades")} (
            <Loadable loading={isLoading} placeholder="0">
              {leader?.trades?.length || 0}
            </Loadable>
            )
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followers">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/*
                THREE STATES, NOT TWO. `leader.followers?.length > 0` alone
                collapsed "still fetching" into "this leader has no followers",
                so the pending page showed a 128px empty-state illustration
                that was then replaced by a table — the exact `loading || empty`
                conflation the spec forbids, and the most misleading kind,
                because the wrong state here is a factual claim about the data.

                Pending renders the REAL header row plus a fixed number of
                pending rows: a list has no knowable length, so the container is
                reserved and the row count is allowed to settle.
              */}
              {isLoading ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={TH}>{tCommon("user")}</TableHead>
                      <TableHead className={TH}>{tCommon("status")}</TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {tCommon("allocated")}
                      </TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {tCommon("profit")}
                      </TableHead>
                      <TableHead className={TH}>{tExt("copy_mode")}</TableHead>
                      <TableHead className={TH}>{tCommon("started")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className={`${TD} font-medium`}>
                          <SkeletonText chars={14} />
                        </TableCell>
                        <TableCell className={TD}>
                          <SkeletonText chars={8} />
                        </TableCell>
                        <TableCell className={TD_NUM}>
                          <SkeletonText chars={9} />
                        </TableCell>
                        <TableCell className={TD_NUM}>
                          <SkeletonText chars={9} />
                        </TableCell>
                        <TableCell className={TD}>
                          <SkeletonText chars={12} />
                        </TableCell>
                        <TableCell className={`${TD} ${FIGURE} text-muted-foreground`}>
                          <SkeletonText placeholder="00/00/0000" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : leader?.followers && leader.followers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={TH}>{tCommon("user")}</TableHead>
                      <TableHead className={TH}>{tCommon("status")}</TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {tCommon("allocated")}
                      </TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {tCommon("profit")}
                      </TableHead>
                      <TableHead className={TH}>{tExt("copy_mode")}</TableHead>
                      <TableHead className={TH}>{tCommon("started")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leader.followers.map((follower: any) => {
                      const profit = num(follower.totalProfit);
                      const allocated =
                        follower.allocations?.filter((a: any) => a.isActive)
                          .length || 0;
                      return (
                        <TableRow key={follower.id}>
                          <TableCell className={`${TD} font-medium`}>
                            {[follower.user?.firstName, follower.user?.lastName]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </TableCell>
                          <TableCell className={TD}>
                            <StatusBadge status={follower.status} />
                          </TableCell>
                          <TableCell className={TD_NUM}>
                            {allocated}{" "}
                            <span className="font-sans text-subtle-foreground">
                              {tCommon("markets").toLowerCase()}
                            </span>
                          </TableCell>
                          <TableCell className={`${TD_NUM} ${pnlInk(profit)}`}>
                            {signedUsd(profit)}
                          </TableCell>
                          <TableCell className={TD}>
                            {COPY_MODE_LABELS[follower.copyMode] ??
                              statusLabel(follower.copyMode)}
                          </TableCell>
                          <TableCell
                            className={`${TD} ${FIGURE} text-muted-foreground`}
                          >
                            {new Date(
                              follower.createdAt
                            ).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <Users className="h-8 w-8 text-subtle-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {tExt("no_followers_yet")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Same three-state split as the followers tab above. */}
              {isLoading ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={TH}>{tCommon("date")}</TableHead>
                      <TableHead className={TH}>{tCommon("symbol")}</TableHead>
                      <TableHead className={TH}>{tCommon("side")}</TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {tCommon("amount")}
                      </TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {tCommon("price")}
                      </TableHead>
                      <TableHead className={`${TH} text-right`}>
                        PnL:
                      </TableHead>
                      <TableHead className={TH}>{tCommon("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className={`${TD} ${FIGURE} text-muted-foreground`}>
                          <SkeletonText placeholder="00/00/0000, 00:00:00 AM" />
                        </TableCell>
                        <TableCell className={`${TD} ${FIGURE} font-medium`}>
                          <SkeletonText placeholder="BTC/USDT" />
                        </TableCell>
                        <TableCell className={TD}>
                          <SkeletonText chars={5} />
                        </TableCell>
                        <TableCell className={TD_NUM}>
                          <SkeletonText placeholder="0.000000" />
                        </TableCell>
                        <TableCell className={TD_NUM}>
                          <SkeletonText placeholder="$0.00" />
                        </TableCell>
                        <TableCell className={TD_NUM}>
                          <SkeletonText placeholder="+$0.00" />
                        </TableCell>
                        <TableCell className={TD}>
                          <SkeletonText chars={7} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : leader?.trades && leader.trades.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={TH}>{tCommon("date")}</TableHead>
                      <TableHead className={TH}>{tCommon("symbol")}</TableHead>
                      <TableHead className={TH}>{tCommon("side")}</TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {tCommon("amount")}
                      </TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {tCommon("price")}
                      </TableHead>
                      <TableHead className={`${TH} text-right`}>
                        PnL:
                      </TableHead>
                      <TableHead className={TH}>{tCommon("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leader.trades.map((trade: any) => {
                      const profit =
                        trade.profit == null ? null : num(trade.profit);
                      return (
                        <TableRow key={trade.id}>
                          <TableCell
                            className={`${TD} ${FIGURE} text-muted-foreground`}
                          >
                            {new Date(trade.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className={`${TD} ${FIGURE} font-medium`}>
                            {trade.symbol}
                          </TableCell>
                          <TableCell className={TD}>
                            {/* The private `GREEN_SIDES` list that used to live
                                here is exactly what `lib/status-tone.ts`
                                replaced — RISE/HIGHER/TOUCH/CALL alias to UP
                                there, so every binary table no longer needs its
                                own copy. */}
                            <StatusBadge status={trade.side} />
                          </TableCell>
                          <TableCell className={TD_NUM}>
                            {num(trade.amount).toFixed(6)}
                          </TableCell>
                          <TableCell className={TD_NUM}>
                            {usd(trade.price)}
                          </TableCell>
                          <TableCell
                            className={`${TD_NUM} ${
                              profit == null ? "" : pnlInk(profit)
                            }`}
                          >
                            {profit == null ? (
                              <span className="text-subtle-foreground">—</span>
                            ) : (
                              signedUsd(profit)
                            )}
                          </TableCell>
                          <TableCell className={TD}>
                            <StatusBadge
                              status={trade.binaryResult || trade.status}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <Activity className="h-8 w-8 text-subtle-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {tCommon("no_trades_yet")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.title}</DialogTitle>
            <DialogDescription>
              {actionDialog.action === "approve" &&
                t("this_will_allow_the_user_to")}
              {actionDialog.action === "reject" &&
                t("this_will_reject_the_leader_application")}
              {actionDialog.action === "suspend" &&
                t("this_will_suspend_the_leader_and")}
              {actionDialog.action === "activate" &&
                t("this_will_reactivate_the_leader_followers")}
            </DialogDescription>
          </DialogHeader>
          {isNegativeAction && (
            <Textarea
              placeholder={`${t("enter_reason")}…`}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={3}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, action: "", title: "" })
              }
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleAction}
              loading={isSubmitting}
              tone={isNegativeAction ? "destructive" : "primary"}
            >
              {tCommon("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
