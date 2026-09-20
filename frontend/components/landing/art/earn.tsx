"use client";

/**
 * Earn-, growth- and support-side illustrations.
 */

import React from "react";
import { Avatar, Card, Chip, Curve, Dot, Flow, IconTile, Label, Link2, Meter, Ring, Scene, Well, corner } from "./scene";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------

/** Staking: what goes in, what it earns, and when it unlocks. */
export function StakingArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("a_staking_pool_showing_its_annual")}>
      {/* Yield */}
      <Card x={28} y={40} w={236} h={236} accent className="lart-float">
        <Label x={146} y={70} size={11} anchor="middle">
          {t("annual_yield")}
        </Label>
        {/* 26, not 32. A tabular "14.2%" is about 3x the font size wide, so at
            32 it measured ~96 units across — exactly the ring's inner diameter
            (2 x (54 - 12/2)), which put both ends of the figure on the stroke. */}
        <Ring cx={146} cy={150} r={54} value={0.82} width={12}>
          <Label x={146} y={146} size={26} weight={700} tone="ink" anchor="middle" mono>
            14.2%
          </Label>
          <Label x={146} y={166} size={10} anchor="middle">
            APR
          </Label>
        </Ring>
        <Well x={52} y={222} w={188} h={38} />
        <Label x={66} y={238} size={10}>
          {tCommon("total_value_locked")}
        </Label>
        <Label x={66} y={254} size={13} weight={700} tone="ink" mono>
          $18,420,900
        </Label>
      </Card>

      {/* Lock periods */}
      <Card x={284} y={40} w={328} h={236}>
        <Label x={308} y={68} size={13} weight={700} tone="ink">
          {t("choose_a_lock_period")}
        </Label>
        <Label x={308} y={86} size={11}>
          {t("longer_locks_earn_a_higher_rate")}
        </Label>
        {[
          { d: "30 days", apr: "6.0%", v: 0.34, active: false },
          { d: "90 days", apr: "9.5%", v: 0.58, active: false },
          { d: "180 days", apr: "14.2%", v: 0.82, active: true },
          { d: "365 days", apr: "19.8%", v: 1, active: false },
        ].map((p, i) => (
          <g key={p.d}>
            <rect
              x={308}
              y={104 + i * 40}
              width={280}
              height={32}
              rx={8} style={corner("inset", 8)}
              fill={p.active ? "hsl(var(--primary))" : "hsl(var(--surface-2))"}
              fillOpacity={p.active ? 0.12 : 1}
              stroke={p.active ? "hsl(var(--primary))" : "transparent"}
              strokeOpacity="0.45"
            />
            <Label x={322} y={124 + i * 40} size={11} weight={600} tone={p.active ? "ink" : "muted"}>
              {p.d}
            </Label>
            <Meter x={398} y={116 + i * 40} w={110} value={p.v} h={6} />
            <Label x={574} y={124 + i * 40} size={12} weight={700} tone={p.active ? "accent" : "ink"} anchor="end" mono>
              {p.apr}
            </Label>
          </g>
        ))}
      </Card>

      {/* Flow into position */}
      <Flow x1={146} y1={292} x2={146} y2={324} />

      {/* Position */}
      <Card x={28} y={336} w={584} h={124}>
        <IconTile x={52} y={362} size={38}>
          <path
            d="M 64 385 v -9 a 7 7 0 0 1 14 0 v 9"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Body was 22x15 at y=386 — 1 unit PAST the tile's 400 bottom, and the
              whole glyph sat 2.5 low. At 18x12 it centres on the tile's (71,381)
              with the ~6 units of clearance every other IconTile glyph keeps. */}
          <rect x={62} y={383} width={18} height={12} rx={3} style={corner("mark", 3)} fill="hsl(var(--primary))" fillOpacity="0.4" />
        </IconTile>
        <Label x={102} y={376} size={13} weight={700} tone="ink">
          {tCommon("your_position")}
        </Label>
        <Label x={102} y={394} size={11}>
          {t("unlocks_14_nov_auto_compounding")}
        </Label>
        <Dot cx={330} cy={370} r={4} />

        <Well x={102} y={406} w={228} h={38} />
        <Label x={116} y={422} size={10}>
          Staked
        </Label>
        <Label x={116} y={438} size={13} weight={700} tone="ink" mono>
          12,500 USDT
        </Label>
        <Label x={316} y={422} size={10} anchor="end">
          Earned
        </Label>
        <Label x={316} y={438} size={13} weight={700} tone="up" anchor="end" mono>
          +842.10
        </Label>

        <Curve values={[4, 7, 6, 11, 14, 12, 19, 23, 21, 29, 34]} x={356} y={372} w={232} h={68} />
      </Card>
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Affiliate: the referral tree and what each level pays. */
export function AffiliateArt() {
  const tComponents = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={tComponents("a_referral_network_paying_commission_across")}>
      {/* Tree */}
      <Card x={28} y={36} w={392} h={268}>
        <Label x={52} y={64} size={12} weight={700} tone="ink">
          {tComponents("your_network")}
        </Label>
        <Label x={396} y={64} size={10} anchor="end">
          3 levels deep
        </Label>

        {/* root */}
        <Avatar cx={224} cy={110} r={22} />
        <Label x={224} y={148} size={10} weight={600} tone="ink" anchor="middle">
          You
        </Label>

        {/* level 1.
            The trunk starts at 152, not at the avatar's 132 edge: "You" sits on
            baseline 148 directly under the root, so a line drawn from 132 ran
            straight through the middle of the word. The label fills the 132-152
            run, so the tree still reads as attached. */}
        <Link2 d="M 224 152 V 158 H 124 V 176" />
        <Link2 d="M 224 152 V 176" />
        <Link2 d="M 224 152 V 158 H 324 V 176" />
        {[124, 224, 324].map((x, i) => (
          <g key={x}>
            <Avatar cx={x} cy={192} r={15} tone="muted" />
            <Flow x1={x} y1={168} x2={x} y2={176} delay={i * 0.5} width={2.5} />
          </g>
        ))}
        <Label x={68} y={196} size={9} tone="accent" weight={700}>
          L1
        </Label>

        {/* level 2 */}
        {/* Each pair is its parent ±24. [88, 160] was 124±36 — it collided with
            the "L2" label and pulled the whole row off the tree's centreline. */}
        {[
          [100, 148],
          [200, 248],
          [300, 348],
        ].map(([a, b], i) => (
          <g key={i}>
            <Link2 d={`M ${[124, 224, 324][i]} 207 V 224 H ${a} V 238`} />
            <Link2 d={`M ${[124, 224, 324][i]} 207 V 224 H ${b} V 238`} />
            <Avatar cx={a} cy={250} r={11} tone="muted" />
            <Avatar cx={b} cy={250} r={11} tone="muted" />
          </g>
        ))}
        <Label x={68} y={254} size={9} tone="accent" weight={700}>
          L2
        </Label>

        <Well x={52} y={272} w={344} h={20} r={6} />
        <Label x={66} y={286} size={10}>
          {tCommon("active_referrals")}
        </Label>
        <Label x={382} y={286} size={11} weight={700} tone="ink" anchor="end" mono>
          148
        </Label>
      </Card>

      {/* Earnings */}
      <Card x={436} y={36} w={176} h={268} accent className="lart-float">
        <Label x={460} y={64} size={11}>
          {tCommon("lifetime_earnings")}
        </Label>
        <Label x={460} y={96} size={26} weight={700} tone="ink" mono>
          $24,180
        </Label>
        <Chip x={460} y={108} label="+$612 / week" tone="up" size={10} />
        <Curve values={[8, 12, 10, 17, 21, 19, 27, 31, 36, 34, 44]} x={460} y={150} w={128} h={64} marker={false} />
        <line x1={460} y1={236} x2={588} y2={236} stroke="hsl(var(--border))" />
        <Label x={460} y={258} size={10}>
          {tComponents("next_payout")}
        </Label>
        <Label x={588} y={258} size={11} weight={700} tone="ink" anchor="end">
          Friday
        </Label>
        <Label x={460} y={280} size={10}>
          Pending
        </Label>
        <Label x={588} y={280} size={11} weight={700} tone="ink" anchor="end" mono>
          $486.20
        </Label>
      </Card>

      {/* Commission tiers */}
      <Card x={28} y={328} w={584} h={132}>
        <Label x={52} y={356} size={12} weight={700} tone="ink">
          {tComponents("commission_by_level")}
        </Label>
        {[
          { x: 52, l: "Level 1", pct: "10%", v: 1 },
          { x: 242, l: "Level 2", pct: "5%", v: 0.5 },
          { x: 432, l: "Level 3", pct: "2.5%", v: 0.25 },
        ].map((t) => (
          <g key={t.l}>
            <Well x={t.x} y={370} w={156} h={72} />
            <Label x={t.x + 16} y={392} size={10}>
              {t.l}
            </Label>
            <Label x={t.x + 16} y={418} size={22} weight={700} tone="ink" mono>
              {t.pct}
            </Label>
            <Meter x={t.x + 16} y={428} w={124} value={t.v} h={5} />
          </g>
        ))}
      </Card>
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Knowledge base: search, the answer, and whether it landed. */
export function SupportArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("a_help_centre_search_returning_ranked")}>
      {/* Search */}
      <Card x={28} y={40} w={584} h={64} accent>
        <circle cx={64} cy={72} r={9} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.4" />
        <path d="M 71 79 l 8 8" stroke="hsl(var(--primary))" strokeWidth="2.4" strokeLinecap="round" />
        <Label x={90} y={78} size={14} tone="ink">
          {t("how_do_i_withdraw_to_my_bank_account")}
        </Label>
        {/* The caret belongs to the query: the text ends at ~338.5, so it sits
            at 340. At 356 it floated 18 units clear and read as unrelated. */}
        <rect className="lart-blink" x={340} y={62} width={1.5} height={20} fill="hsl(var(--primary))" />
        <Chip x={508} y={60} label="42 results" tone="muted" size={10} />
      </Card>

      {/* Results */}
      <Card x={28} y={124} w={392} h={228}>
        {[
          { t: "Withdrawing fiat to a bank account", c: "Payments", best: true },
          { t: "Verification levels and limits", c: "Account" },
          { t: "How long do withdrawals take?", c: "Payments" },
          { t: "Supported countries and currencies", c: "Payments" },
        ].map((r, i) => (
          <g key={r.t}>
            {/* Row block runs 138..338 in a 124..352 card: 14 top / 14 bottom.
                At 144 it was 20 top / 8 bottom and the last row hugged the edge.
                Everything below is centred on the row's own 160 centreline. */}
            <rect
              x={52}
              y={138 + i * 52}
              width={344}
              height={44}
              rx={9} style={corner("inset", 9)}
              fill={r.best ? "hsl(var(--primary))" : "hsl(var(--surface-2))"}
              fillOpacity={r.best ? 0.1 : 1}
              stroke={r.best ? "hsl(var(--primary))" : "transparent"}
              strokeOpacity="0.4"
            />
            <IconTile x={64} y={148 + i * 52} size={24}>
              <path
                d={`M 71 ${155 + i * 52} h 10 M 71 ${160 + i * 52} h 10 M 71 ${165 + i * 52} h 6`}
                stroke="hsl(var(--primary))"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </IconTile>
            <Label x={100} y={156 + i * 52} size={11} weight={600} tone="ink">
              {r.t}
            </Label>
            <Label x={100} y={171 + i * 52} size={10} tone="subtle">
              {r.c}
            </Label>
            {r.best && (
              <Label x={384} y={163 + i * 52} size={9} tone="accent" weight={700} anchor="end">
                {t("top_match")}
              </Label>
            )}
          </g>
        ))}
      </Card>

      {/* Categories */}
      <Card x={436} y={124} w={176} h={228}>
        <Label x={460} y={150} size={12} weight={700} tone="ink">
          Browse
        </Label>
        {[
          { n: "Getting started", c: 24 },
          { n: "Payments", c: 41 },
          { n: "Trading", c: 63 },
          { n: "Security", c: 18 },
          { n: "API", c: 32 },
        ].map((cat, i) => (
          <g key={cat.n}>
            <Well x={460} y={162 + i * 36} w={128} h={28} r={7} />
            <Label x={474} y={180 + i * 36} size={10} tone="ink">
              {cat.n}
            </Label>
            <Label x={574} y={180 + i * 36} size={10} anchor="end" mono>
              {cat.c}
            </Label>
          </g>
        ))}
      </Card>

      {/* Feedback */}
      <Card x={28} y={372} w={584} h={88}>
        <Label x={52} y={402} size={12} weight={600} tone="ink">
          {tCommon("was_this_article_helpful")}
        </Label>
        <rect x={52} y={414} width={92} height={30} rx={8} style={corner("control", 8)} fill="hsl(var(--primary))" />
        <Label x={98} y={434} size={11} weight={700} anchor="middle">
          <tspan fill="hsl(var(--primary-foreground))">Yes</tspan>
        </Label>
        <rect x={156} y={414} width={92} height={30} rx={8} style={corner("control", 8)} fill="hsl(var(--surface-2))" stroke="hsl(var(--border))" />
        <Label x={202} y={434} size={11} weight={600} tone="ink" anchor="middle">
          No
        </Label>

        <Label x={588} y={402} size={10} anchor="end">
          {t("still_stuck_open_a_ticket")}
        </Label>
        <Label x={588} y={430} size={10} anchor="end" tone="accent" weight={600}>
          {t("median_first_reply_14_min")}
        </Label>
      </Card>
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** AI-managed investment: model in the loop, allocation, realised result. */
export function AiInvestmentArt() {
  const t = useTranslations("components");
  return (
    <Scene label={t("an_ai_managed_investment_plan_showing")}>
      <Card x={28} y={40} w={264} h={168} accent className="lart-float">
        <g className="lart-breathe">
          <circle cx={92} cy={92} r={30} fill="hsl(var(--primary))" fillOpacity="0.1" stroke="hsl(var(--primary))" strokeOpacity="0.45" strokeWidth="2" />
          <circle cx={82} cy={84} r={4} fill="hsl(var(--primary))" />
          <circle cx={102} cy={84} r={4} fill="hsl(var(--primary))" />
          <circle cx={92} cy={102} r={4} fill="hsl(var(--primary))" />
          <path d="M 82 84 L 102 84 L 92 102 Z" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        </g>
        <Label x={136} y={86} size={13} weight={700} tone="ink">
          Model v4.2
        </Label>
        <Label x={136} y={104} size={10}>
          Retrained 6h ago
        </Label>
        {/* The figure sits beside its caption, not under the bar. At y=186 its
            baseline was 2 units off the well's bottom edge, so it read as
            printed on the border. */}
        {/* w=216, not 212: the card is 28..292, so a well at 52 has to end at
            268 to keep the 24-unit inset it has on the left. */}
        <Well x={52} y={140} w={216} h={48} />
        <Label x={66} y={161} size={10}>
          Confidence
        </Label>
        <Label x={254} y={161} size={11} weight={700} tone="ink" anchor="end" mono>
          87%
        </Label>
        <Meter x={66} y={172} w={188} value={0.87} h={6} />
      </Card>

      <Card x={308} y={40} w={304} h={168}>
        <Label x={332} y={68} size={12} weight={700} tone="ink">
          Allocation
        </Label>
        {[
          { n: "BTC", v: 0.42, p: "42%" },
          { n: "ETH", v: 0.28, p: "28%" },
          { n: "SOL", v: 0.18, p: "18%" },
          { n: "Cash", v: 0.12, p: "12%" },
        ].map((a, i) => (
          <g key={a.n}>
            <Label x={332} y={96 + i * 28} size={10} tone="ink">
              {a.n}
            </Label>
            <Meter x={376} y={89 + i * 28} w={172} value={a.v} h={7} />
            <Label x={588} y={96 + i * 28} size={10} anchor="end" mono>
              {a.p}
            </Label>
          </g>
        ))}
      </Card>

      <Card x={28} y={240} w={584} h={220}>
        <Label x={52} y={268} size={13} weight={700} tone="ink">
          {t("realised_performance")}
        </Label>
        {/* Centred on the title beside it: a size-13 label on baseline 268 has
            its optical centre at ~262.75, so a 23-tall pill starts at 251. */}
        <Chip x={198} y={251} label="90-day plan" tone="muted" size={10} />
        <Label x={588} y={268} size={10} anchor="end">
          Benchmark +6.1%
        </Label>
        {/* The whole lower block sits 12 higher than it used to: the stat values
            on baseline 456 put their text box exactly on the card's 460 bottom
            edge, so the figures read as printed on the border. */}
        <Curve values={[10, 14, 12, 19, 24, 21, 30, 27, 36, 42, 39, 50, 56]} x={52} y={288} w={536} h={100} />
        <line x1={52} y1={404} x2={588} y2={404} stroke="hsl(var(--border))" />
        {[
          { x: 52, k: "Return", v: "+21.4%", tone: "up" as const },
          { x: 196, k: "Max drawdown", v: "-4.2%", tone: "ink" as const },
          { x: 356, k: "Sharpe", v: "1.84", tone: "ink" as const },
          { x: 484, k: "Trades", v: "1,248", tone: "ink" as const },
        ].map((s) => (
          <g key={s.k}>
            <Label x={s.x} y={424} size={10}>
              {s.k}
            </Label>
            <Label x={s.x} y={444} size={15} weight={700} tone={s.tone} mono>
              {s.v}
            </Label>
          </g>
        ))}
      </Card>
    </Scene>
  );
}
