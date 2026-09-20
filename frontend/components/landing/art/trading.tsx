"use client";

/**
 * Trading-side illustrations.
 *
 * Each scene shows the product doing its actual job — an equity curve for a
 * managed plan, a leader fanning fills out to followers, a strategy pipeline,
 * a maker quoting both sides of a book. Generic "abstract fintech shapes" is
 * what the old hero orbs were, and it is why nine pages looked interchangeable.
 */

import React from "react";
import { Avatar, Bars, Candles, Card, Chip, Curve, Dot, Flow, IconTile, Label, Meter, Ring, Scene, Well, corner } from "./scene";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------

/** Managed forex: one plan, its equity curve, and what it pays. */
export function ForexArt() {
  const t = useTranslations("components");
  return (
    <Scene label={t("a_managed_forex_investment_plan_showing")}>
      {/* Equity curve */}
      <Card x={28} y={44} w={412} h={228} className="lart-float">
        <Label x={52} y={76} size={14} weight={700} tone="ink">
          {t("managed_portfolio")}
        </Label>
        <Label x={52} y={96} size={11}>
          {t("aggregated_across_all_active_plans")}
        </Label>
        <Dot cx={410} cy={72} r={4} />
        <Label x={398} y={76} size={10} weight={600} tone="up" anchor="end">
          LIVE
        </Label>

        <Curve values={[18, 22, 20, 29, 26, 35, 33, 44, 41, 52, 58, 55, 68]} x={52} y={118} w={364} h={104} />

        <Label x={52} y={252} size={11}>
          12-month equity
        </Label>
        <Label x={416} y={252} size={13} weight={700} tone="up" anchor="end" mono>
          +18.4%
        </Label>
      </Card>

      {/* Return ring */}
      <Card x={456} y={44} w={156} h={228} accent>
        <Label x={534} y={76} size={11} anchor="middle">
          {t("target_roi")}
        </Label>
        <Ring cx={534} cy={144} r={44} value={0.72}>
          <Label x={534} y={143} size={24} weight={700} tone="ink" anchor="middle" mono>
            12%
          </Label>
          <Label x={534} y={160} size={10} anchor="middle">
            monthly
          </Label>
        </Ring>
        <Well x={478} y={206} w={112} h={38} />
        <Label x={492} y={222} size={10}>
          Duration
        </Label>
        <Label x={492} y={238} size={12} weight={700} tone="ink">
          90 days
        </Label>
      </Card>

      {/* Plan row.
          The fill meter is on its own line under the plan's terms. It used to
          share the line with them: the subtitle runs to roughly x=324 and the
          meter started at 306, so the bar sat on top of "Auto-compound" — and
          its "Filled" caption was 10 units above the bar, close enough to read
          as stuck to it. */}
      <Card x={28} y={296} w={584} h={104}>
        <IconTile x={52} y={322} size={38}>
          <path
            d="M 57.5 351 l 8 -11 l 7 6 l 12 -16"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconTile>
        <Label x={104} y={336} size={13} weight={700} tone="ink">
          {t("institutional_growth")}
        </Label>
        <Label x={104} y={354} size={11}>
          Min $500 · Weekly payouts · Auto-compound
        </Label>

        <Label x={104} y={383} size={10}>
          Filled
        </Label>
        <Meter x={146} y={377} w={150} value={0.78} animate />
        <Label x={308} y={383} size={10} weight={600} tone="ink" mono>
          78%
        </Label>

        {/* Both centre on 341, the row's centreline — the same one the IconTile
            and the two-line title block sit on. */}
        <Chip x={430} y={329} label="Accepting" tone="accent" />
        <Label x={588} y={348} size={18} weight={700} tone="ink" anchor="end" mono>
          $2.4M
        </Label>
      </Card>

      <Chip x={28} y={420} w={131} label={t("fixed_payout")} />
      <Chip x={168} y={420} label={t("mt5_signals")} />
      <Chip x={274} y={420} label={t("daily_reporting")} tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Copy trading: one leader, three followers, the same fill mirrored down. */
export function CopyTradingArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("a_lead_traders_position_being_mirrored")}>
      {/* Leader */}
      <Card x={150} y={36} w={340} h={132} accent className="lart-float">
        <Avatar cx={192} cy={78} r={22} />
        <Label x={226} y={72} size={14} weight={700} tone="ink">
          {t("alex_moreno")}
        </Label>
        <Label x={226} y={90} size={11}>
          {t("verified_lead_trader_412_copiers")}
        </Label>
        {/* 403, not 378: at 378 the pill's bottom-left corner sat on the final
            "s" of the subtitle. This right-aligns it to the Well below. */}
        {/* y=66 puts the pill's centre on 78 — the avatar's centre, which is the
            row's centreline. At 62 it sat 4 above it and read as floating. */}
        <Chip x={403} y={66} label="+34.8%" tone="up" />

        <Well x={174} y={112} w={292} h={40} />
        <Label x={190} y={130} size={10}>
          {t("open_position")}
        </Label>
        <Label x={190} y={146} size={12} weight={700} tone="ink" mono>
          BTC/USDT · Long 2.5x
        </Label>
        <Label x={450} y={139} size={13} weight={700} tone="up" anchor="end" mono>
          +$1,284
        </Label>
      </Card>

      {/* Fan-out */}
      <Flow x1={230} y1={182} x2={132} y2={252} />
      <Flow x1={320} y1={182} x2={320} y2={252} delay={0.5} />
      <Flow x1={410} y1={182} x2={508} y2={252} delay={1} />

      {/* Followers */}
      {[
        { x: 28, name: "Follower", size: "$2,400", pnl: "+$61" },
        { x: 236, name: "Follower", size: "$8,900", pnl: "+$228" },
        { x: 444, name: "Follower", size: "$1,150", pnl: "+$29" },
      ].map((f, i) => (
        <Card key={f.x} x={f.x} y={268} w={168} h={128} style={{ animationDelay: `${i * 0.4}s` }}>
          <Avatar cx={f.x + 34} cy={302} r={16} tone="muted" />
          <Label x={f.x + 58} y={299} size={12} weight={600} tone="ink">
            {f.name} {i + 1}
          </Label>
          <Label x={f.x + 58} y={314} size={10}>
            {t("auto_copy_on")}
          </Label>

          <Well x={f.x + 16} y={330} w={136} h={50} />
          <Label x={f.x + 30} y={350} size={10}>
            Allocation
          </Label>
          <Label x={f.x + 138} y={350} size={11} weight={700} tone="ink" anchor="end" mono>
            {f.size}
          </Label>
          <Label x={f.x + 30} y={370} size={10}>
            {t("mirrored_p_l")}
          </Label>
          <Label x={f.x + 138} y={370} size={11} weight={700} tone="up" anchor="end" mono>
            {f.pnl}
          </Label>
        </Card>
      ))}

      <Chip x={150} y={428} label={tCommon("proportional_sizing")} />
      <Chip x={306} y={428} label={t("stop_copying_anytime")} tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Trading bots: signal in, rules in the middle, orders out. */
export function TradingBotArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("an_automated_strategy_converting_a_market")}>
      {/* Pipeline */}
      <Card x={28} y={44} w={168} h={104}>
        <Label x={48} y={70} size={10} tone="accent" weight={700}>
          SIGNAL
        </Label>
        {/* The caption clears the card by 13, matching the STRATEGY card beside
            it. At baseline 140 it sat 5 units off the border and read as
            printed on it; the curve gives up 8 to pay for it. */}
        <Curve values={[10, 14, 12, 20, 17, 26, 31]} x={48} y={82} w={128} h={36} fill={false} marker={false} width={2} />
        <Label x={48} y={132} size={11} weight={600} tone="ink">
          {t("rsi_crossover")}
        </Label>
      </Card>

      <Flow x1={204} y1={96} x2={228} y2={96} />

      <Card x={236} y={44} w={168} h={104} accent>
        <Label x={256} y={70} size={10} tone="accent" weight={700}>
          STRATEGY
        </Label>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <Well x={256} y={80 + i * 20} w={128} h={15} r={4} />
            <rect x={262} y={84 + i * 20} width={7} height={7} rx={2} style={corner("mark", 2)} fill="hsl(var(--primary))" />
          </g>
        ))}
      </Card>

      <Flow x1={412} y1={96} x2={436} y2={96} delay={0.6} />

      <Card x={444} y={44} w={168} h={104}>
        <Label x={464} y={70} size={10} tone="accent" weight={700}>
          EXECUTION
        </Label>
        <Bars values={[5, 8, 6, 11, 9, 13, 10, 15]} x={464} y={80} w={128} h={36} tone="accent" />
        <Label x={464} y={132} size={11} weight={600} tone="ink">
          142 orders / 24h
        </Label>
      </Card>

      {/* Bot status */}
      <Card x={28} y={176} w={352} h={216} className="lart-float">
        <IconTile x={52} y={200} size={36}>
          {/* Centred on the glyph's FULL outline, antenna included — centring the
              head rect alone pushed the whole mark 3.5 units high in the tile,
              the same trap the padlock hit in platform.tsx. */}
          <rect x={61} y={213.5} width={18} height={14} rx={3} style={corner("mark", 3)} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
          <circle cx={66} cy={220.5} r="1.8" fill="hsl(var(--primary))" />
          <circle cx={74} cy={220.5} r="1.8" fill="hsl(var(--primary))" />
          <path d="M 70 213.5 v -5" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
        </IconTile>
        <Label x={100} y={216} size={13} weight={700} tone="ink">
          {t("grid_bot_eth_usdt")}
        </Label>
        <Label x={100} y={233} size={11}>
          Running for 14 days
        </Label>
        <Dot cx={352} cy={212} r={4} />

        <Curve values={[20, 24, 21, 30, 27, 36, 34, 42, 47, 44, 55]} x={52} y={252} w={304} h={78} />

        <Well x={52} y={344} w={144} h={34} />
        <Label x={66} y={358} size={10}>
          {tCommon("total_profit")}
        </Label>
        <Label x={66} y={372} size={13} weight={700} tone="up" mono>
          +$3,912
        </Label>
        <Well x={212} y={344} w={144} h={34} />
        <Label x={226} y={358} size={10}>
          {tCommon("win_rate")}
        </Label>
        <Label x={226} y={372} size={13} weight={700} tone="ink" mono>
          71.4%
        </Label>
      </Card>

      {/* Grid ladder */}
      <Card x={396} y={176} w={216} h={216}>
        <Label x={420} y={202} size={11} weight={600} tone="ink">
          {tCommon("grid_levels")}
        </Label>
        {[
          { p: "2,412.50", t: "down" as const },
          { p: "2,388.00", t: "down" as const },
          { p: "2,364.25", t: "down" as const },
        ].map((r, i) => (
          <g key={r.p}>
            <Well x={420} y={214 + i * 24} w={168} h={19} r={5} />
            <Label x={430} y={227 + i * 24} size={10} tone="down" weight={600} mono>
              SELL
            </Label>
            <Label x={578} y={227 + i * 24} size={10} tone="ink" anchor="end" mono>
              {r.p}
            </Label>
          </g>
        ))}
        {/* The label sits beside the mid line, not on top of it. Stacked, its
            glyphs ran from y=281 — exactly where the last SELL row ends — so it
            read as printed over that row. */}
        <Label x={420} y={295} size={9} tone="accent" weight={700}>
          MID
        </Label>
        <line x1={452} y1={292} x2={588} y2={292} stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="3 4" />
        {[
          { p: "2,316.75" },
          { p: "2,292.00" },
          { p: "2,268.50" },
        ].map((r, i) => (
          <g key={r.p}>
            <Well x={420} y={300 + i * 24} w={168} h={19} r={5} />
            <Label x={430} y={313 + i * 24} size={10} tone="up" weight={600} mono>
              BUY
            </Label>
            <Label x={578} y={313 + i * 24} size={10} tone="ink" anchor="end" mono>
              {r.p}
            </Label>
          </g>
        ))}
      </Card>

      <Chip x={28} y={420} label="Backtested" />
      <Chip x={140} y={420} label="Runs 24/7" tone="muted" />
      <Chip x={244} y={420} w={134} label={t("risk_limits_enforced")} />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Hummingbot: a market maker quoting both sides, with its inventory skew. */
export function HummingbotArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("a_market_making_bot_quoting_both")}>
      {/* Book */}
      <Card x={28} y={40} w={300} h={288} className="lart-float">
        <Label x={52} y={68} size={13} weight={700} tone="ink">
          {tCommon("order_book")}
        </Label>
        <Label x={304} y={68} size={10} anchor="end">
          BTC/USDT
        </Label>

        {[0.95, 0.78, 0.62, 0.45].map((w, i) => (
          <g key={`a${i}`}>
            <rect x={52} y={84 + i * 22} width={252 * w} height={16} rx={3} style={corner("inset", 3)} fill="hsl(var(--down))" fillOpacity="0.12" />
            <Label x={60} y={96 + i * 22} size={10} tone="down" mono>
              {(68420 + (4 - i) * 12).toLocaleString()}
            </Label>
            <Label x={296} y={96 + i * 22} size={10} anchor="end" mono>
              {(0.42 + i * 0.31).toFixed(2)}
            </Label>
          </g>
        ))}

        {/* Centred in the 84..300 book: 11 units of air above and below, where
            the mid-price row used to sit 14 under the asks and 8 over the bids. */}
        <Well x={52} y={177} w={252} h={30} />
        <Label x={62} y={197} size={13} weight={700} tone="ink" mono>
          68,412.50
        </Label>
        <Chip x={216} y={181} label="0.04%" tone="accent" size={10} />

        {[0.5, 0.66, 0.81, 0.93].map((w, i) => (
          <g key={`b${i}`}>
            <rect x={52} y={218 + i * 22} width={252 * w} height={16} rx={3} style={corner("inset", 3)} fill="hsl(var(--up))" fillOpacity="0.12" />
            <Label x={60} y={230 + i * 22} size={10} tone="up" mono>
              {(68400 - i * 12).toLocaleString()}
            </Label>
            <Label x={296} y={230 + i * 22} size={10} anchor="end" mono>
              {(0.38 + i * 0.27).toFixed(2)}
            </Label>
          </g>
        ))}
      </Card>

      {/* Instance */}
      <Card x={348} y={40} w={264} h={132} accent>
        <IconTile x={372} y={62} size={34}>
          <path
            d="M 381 86.5 l 5 -9 l 5 5 l 7 -11"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconTile>
        <Label x={416} y={76} size={12} weight={700} tone="ink">
          pure_market_making
        </Label>
        <Label x={416} y={92} size={10}>
          {t("instance_uptime_9d_4h")}
        </Label>
        <Dot cx={584} cy={72} r={4} />

        <Well x={372} y={116} w={216} h={38} />
        <Label x={386} y={132} size={10}>
          Spread
        </Label>
        <Label x={386} y={148} size={12} weight={700} tone="ink" mono>
          0.35% / 0.35%
        </Label>
        <Label x={574} y={132} size={10} anchor="end">
          Refresh
        </Label>
        <Label x={574} y={148} size={12} weight={700} tone="ink" anchor="end" mono>
          30s
        </Label>
      </Card>

      {/* Inventory */}
      <Card x={348} y={192} w={264} h={136}>
        <Label x={372} y={218} size={12} weight={700} tone="ink">
          {t("inventory_skew")}
        </Label>
        <Label x={372} y={244} size={10}>
          BTC
        </Label>
        <Meter x={372} y={252} w={216} value={0.58} />
        <Label x={372} y={280} size={10}>
          USDT
        </Label>
        <Meter x={372} y={288} w={216} value={0.42} />
        <Label x={372} y={314} size={10}>
          {t("target_ratio_50")} 50
        </Label>
        <Label x={588} y={314} size={11} weight={700} tone="ink" anchor="end" mono>
          58 / 42
        </Label>
      </Card>

      {/* Fills */}
      <Card x={28} y={348} w={584} h={72}>
        <Label x={52} y={374} size={11} weight={600} tone="ink">
          {t("recent_fills")}
        </Label>
        {[
          { x: 150, s: "BUY", t: "up" as const },
          { x: 262, s: "SELL", t: "down" as const },
          { x: 374, s: "BUY", t: "up" as const },
          { x: 486, s: "SELL", t: "down" as const },
        ].map((f) => (
          <g key={f.x}>
            <Well x={f.x} y={362} w={100} h={40} r={7} />
            <Label x={f.x + 12} y={378} size={10} tone={f.t} weight={700}>
              {f.s}
            </Label>
            <Label x={f.x + 12} y={393} size={10} tone="ink" mono>
              0.0{Math.floor(f.x / 100)}4 BTC
            </Label>
          </g>
        ))}
      </Card>

      <Chip x={28} y={444} label={t("self_hosted_or_managed")} />
      <Chip x={214} y={444} label={t("hmac_signed_api")} tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Futures / leveraged trading: position, margin, and the liquidation distance. */
export function FuturesArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("a_leveraged_futures_position_showing_entry")}>
      <Card x={28} y={40} w={392} h={252} className="lart-float">
        <Label x={52} y={68} size={13} weight={700} tone="ink">
          {t("btc_usdt_perpetual")}
        </Label>
        {/* Parked in the empty middle of the row rather than nudged along after
            the title. Twice now the chip has been placed from an *estimate* of
            how wide "BTC/USDT Perpetual" renders, and twice it landed on the
            last letters — bold 13px is wider than the 0.53em/char rule of thumb.
            The gap between the title and "Funding" is ~140 units wide; sitting
            in the middle of it cannot collide with either whatever the font
            does. */}
        <Chip x={244} y={54} label="20x" tone="accent" size={10} />
        <Label x={396} y={68} size={10} anchor="end">
          Funding 0.0071%
        </Label>
        <Candles
          values={[
            { o: 30, c: 36, hi: 39, lo: 28 },
            { o: 36, c: 33, hi: 38, lo: 31 },
            { o: 33, c: 41, hi: 44, lo: 32 },
            { o: 41, c: 39, hi: 45, lo: 37 },
            { o: 39, c: 48, hi: 51, lo: 38 },
            { o: 48, c: 45, hi: 50, lo: 43 },
            { o: 45, c: 54, hi: 57, lo: 44 },
            { o: 54, c: 61, hi: 64, lo: 52 },
            { o: 61, c: 57, hi: 63, lo: 55 },
            { o: 57, c: 66, hi: 69, lo: 56 },
            { o: 66, c: 72, hi: 76, lo: 64 },
            { o: 72, c: 69, hi: 75, lo: 67 },
          ]}
          x={52}
          y={86}
          w={344}
          h={140}
        />
        <line x1={52} y1={252} x2={396} y2={252} stroke="hsl(var(--border))" />
        <Label x={52} y={272} size={10}>
          Entry 66,120
        </Label>
        <Label x={224} y={272} size={10} anchor="middle">
          Mark 68,412
        </Label>
        <Label x={396} y={272} size={10} tone="down" anchor="end">
          Liq. 63,880
        </Label>
      </Card>

      <Card x={436} y={40} w={176} h={252} accent>
        <Label x={460} y={68} size={11}>
          {t("unrealised_p_l")}
        </Label>
        <Label x={460} y={98} size={26} weight={700} tone="up" mono>
          +$2,284
        </Label>
        <Chip x={460} y={112} label="+18.2%" tone="up" size={10} />

        <line x1={460} y1={152} x2={588} y2={152} stroke="hsl(var(--border))" />
        <Label x={460} y={176} size={10}>
          {tCommon("margin_used")}
        </Label>
        <Meter x={460} y={186} w={128} value={0.34} />
        <Label x={460} y={210} size={11} weight={600} tone="ink" mono>
          $1,240 / $3,600
        </Label>

        <Label x={460} y={240} size={10}>
          {tCommon("distance_to_liq")}
        </Label>
        <Meter x={460} y={250} w={128} value={0.66} tone="down" />
        <Label x={460} y={274} size={11} weight={600} tone="ink" mono>
          6.6%
        </Label>
      </Card>

      <Card x={28} y={312} w={584} h={84}>
        {[
          { x: 52, k: "Open interest", v: "$412M" },
          { x: 196, k: "24h volume", v: "$1.8B" },
          { x: 340, k: "Max leverage", v: "125x" },
          { x: 484, k: "Maker fee", v: "0.02%" },
        ].map((s) => (
          <g key={s.k}>
            <Label x={s.x} y={344} size={10}>
              {s.k}
            </Label>
            <Label x={s.x} y={368} size={17} weight={700} tone="ink" mono>
              {s.v}
            </Label>
          </g>
        ))}
      </Card>

      <Chip x={28} y={424} label={t("isolated_cross_margin")} />
      <Chip x={214} y={424} label={tCommon("stop_loss_take_profit")} tone="muted" />
    </Scene>
  );
}
