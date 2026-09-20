"use client";

/**
 * Core-platform illustrations.
 *
 * `trading.tsx`, `markets.tsx` and `earn.tsx` cover the addons, because that is
 * where the landing-page work started — every addon root got a scene and the
 * core landing page got none. So the four products that ship *without* an
 * extension (spot, binary, the ecosystem's own chain, and the multi-asset
 * margin account) had no art at all, and neither did the platform as a whole.
 * That is the gap this file closes.
 *
 * Same rules as the rest of the folder: every fill is `hsl(var(--…))` so the
 * scene follows the theme and the operator's brand hue, ids come from `Scene`
 * rather than being hardcoded, and `up`/`down` appear only where the value is
 * genuinely a direction of money (R5).
 */

import React from "react";
import { Bars, Candles, Card, Chip, Curve, Dot, Flow, IconTile, Label, Meter, Ring, Scene, Well, corner } from "./scene";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------

/** Spot: a chart, the ticket you fill in beside it, and the rest of the book. */
export function SpotArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const rows = [
    { symbol: "ETH/USDT", price: "3,284.10", change: "+1.82%", up: true },
    { symbol: "SOL/USDT", price: "182.44", change: "+4.06%", up: true },
    { symbol: "XRP/USDT", price: "0.6218", change: "-0.94%", up: false },
  ];

  return (
    <Scene label={t("a_spot_market_a_candlestick_chart")}>
      {/* Chart */}
      <Card x={28} y={40} w={392} h={232} className="lart-float">
        <Label x={52} y={72} size={14} weight={700} tone="ink">
          BTC/USDT
        </Label>
        {/* The price sits on 96, not 92. The change pill is 23 tall (size + 13)
            and has to CENTRE on the price, so at baseline 92 its box top landed
            on 76 — half a unit under the title's 75.5 and overlapping it by 3.6
            horizontally. On a rounded theme the pill's corner curves out of the
            way; at `--radius: 0` it is a hard rectangle and reads as a collision.
            Four more units of leading clears the title's ink by 8. */}
        <Label x={52} y={96} size={11} mono>
          68,412.50
        </Label>
        {/* Centred on the price (cy 91.5) and a normal word-gap after it. It was
            at x=140, which started 40 units past the number — further right than
            the title above it — so it read as unanchored. */}
        <Chip x={116} y={80} label="+2.41%" tone="up" size={10} />
        {/* Shares the title's 72 baseline; the dot centres on LIVE's cap band. */}
        <Label x={384} y={72} size={10} weight={600} tone="up" anchor="end">
          LIVE
        </Label>
        <Dot cx={396} cy={68} r={4} />

        <Candles
          x={52}
          y={116}
          w={344}
          h={112}
          values={[
            { o: 30, c: 38, hi: 41, lo: 28 },
            { o: 38, c: 34, hi: 40, lo: 32 },
            { o: 34, c: 45, hi: 47, lo: 33 },
            { o: 45, c: 43, hi: 49, lo: 41 },
            { o: 43, c: 52, hi: 55, lo: 42 },
            { o: 52, c: 48, hi: 54, lo: 46 },
            { o: 48, c: 58, hi: 61, lo: 47 },
            { o: 58, c: 55, hi: 62, lo: 53 },
            { o: 55, c: 66, hi: 69, lo: 54 },
            { o: 66, c: 72, hi: 75, lo: 64 },
            { o: 72, c: 68, hi: 74, lo: 66 },
            { o: 68, c: 79, hi: 82, lo: 67 },
          ]}
        />

        <Label x={52} y={252} size={10}>
          {`24h ${tCommon('volume')}`}
        </Label>
        <Label x={396} y={252} size={11} weight={700} tone="ink" anchor="end" mono>
          $1.28B
        </Label>
      </Card>

      {/* Ticket */}
      <Card x={436} y={40} w={176} h={232} accent>
        <Well x={452} y={64} w={144} h={30} r={8} />
        <rect x={454} y={66} width={70} height={26} rx={7} style={corner("control", 7)} fill="hsl(var(--up))" fillOpacity="0.16" />
        <Label x={489} y={84} size={11} weight={700} tone="up" anchor="middle">
          Buy
        </Label>
        <Label x={560} y={84} size={11} weight={600} anchor="middle">
          Sell
        </Label>

        <Label x={452} y={118} size={10}>
          Price
        </Label>
        <Well x={452} y={126} w={144} h={30} />
        <Label x={464} y={146} size={11} weight={600} tone="ink" mono>
          68,412.50
        </Label>

        <Label x={452} y={176} size={10}>
          Amount
        </Label>
        <Well x={452} y={184} w={144} h={30} />
        <Label x={464} y={204} size={11} weight={600} tone="ink" mono>
          0.250 BTC
        </Label>

        <g className="lart-breathe">
          <Chip x={452} y={228} label={tCommon("place_order")} w={144} />
        </g>
      </Card>

      {/* Book */}
      {/* 284..424, not 288..416: at h=128 the last row well ended 6 units off the
          card's bottom edge against a 24-unit inset on both sides. The extra 12
          comes out of the gutter above rather than by moving the chip row, which
          sits at 436 in every scene in this file to mirror the 40-unit top margin. */}
      <Card x={28} y={284} w={584} h={140}>
        <Label x={52} y={312} size={12} weight={700} tone="ink">
          {t("top_markets")}
        </Label>
        <Label x={588} y={312} size={10} anchor="end">
          24h
        </Label>
        {rows.map((row, i) => {
          const y = 326 + i * 28;
          return (
            <g key={row.symbol}>
              <Well x={52} y={y} w={536} h={24} r={6} />
              <Label x={66} y={y + 16} size={11} weight={600} tone="ink">
                {row.symbol}
              </Label>
              <Label x={430} y={y + 16} size={11} anchor="end" mono>
                {row.price}
              </Label>
              <Label
                x={576}
                y={y + 16}
                size={11}
                weight={600}
                tone={row.up ? "up" : "down"}
                anchor="end"
                mono
              >
                {row.change}
              </Label>
            </g>
          );
        })}
      </Card>

      <Chip x={28} y={436} label="Limit" />
      <Chip x={96} y={436} label="Market" />
      <Chip x={172} y={436} label="Stop-loss" tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/**
 * Binary: one strike, one clock, two outcomes.
 *
 * UP and DOWN are the whole product here, so this is the one scene where two
 * saturated hues are correct — they are direction of money, which is exactly
 * what `--up` and `--down` are reserved for.
 */
export function BinaryArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const results = [
    { x: 156, dir: "UP", won: true, value: "+$212" },
    { x: 268, dir: "DOWN", won: true, value: "+$212" },
    { x: 380, dir: "UP", won: false, value: "-$250" },
    { x: 492, dir: "UP", won: true, value: "+$212" },
  ];

  return (
    <Scene label={t("a_binary_option_a_price_curve")}>
      {/* Price against the strike */}
      <Card x={28} y={40} w={392} h={252} className="lart-float">
        <Label x={52} y={72} size={13} weight={700} tone="ink">
          BTC/USDT
        </Label>
        <Label x={330} y={74} size={10} anchor="end">
          {tCommon("expires_in")}
        </Label>
        <Chip x={340} y={58} label="00:38" size={11} />

        <Curve
          values={[42, 40, 46, 44, 52, 49, 58, 55, 63, 60, 69, 74]}
          x={52}
          y={104}
          w={344}
          h={124}
        />

        {/* The strike. Dashed, accent, and labelled — a plain hairline here
            would read as a chart gridline rather than the line that decides
            whether the position pays. */}
        <line
          x1={52}
          y1={176}
          x2={396}
          y2={176}
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeDasharray="5 6"
          strokeOpacity="0.75"
        />
        <Label x={52} y={170} size={10} weight={600} tone="accent">
          Strike 68,400
        </Label>

        <Label x={52} y={252} size={10}>
          Entry 68,400.00
        </Label>
        <Label x={396} y={252} size={11} weight={700} tone="up" anchor="end" mono>
          68,468.20
        </Label>
        <Label x={52} y={270} size={10}>
          60-second expiry
        </Label>
      </Card>

      {/* Position */}
      <Card x={436} y={40} w={176} h={252} accent>
        <Label x={524} y={72} size={10} anchor="middle">
          Payout
        </Label>
        <Label x={524} y={106} size={30} weight={700} tone="ink" anchor="middle" mono>
          85%
        </Label>

        <Well x={452} y={126} w={144} h={34} />
        <Label x={464} y={147} size={10}>
          Stake
        </Label>
        <Label x={584} y={147} size={11} weight={700} tone="ink" anchor="end" mono>
          $250
        </Label>

        <Well x={452} y={168} w={144} h={34} />
        <Label x={464} y={189} size={10}>
          Returns
        </Label>
        <Label x={584} y={189} size={11} weight={700} tone="up" anchor="end" mono>
          $462.50
        </Label>

        <g className="lart-breathe">
          <rect
            x={452}
            y={220}
            width={68}
            height={38}
            rx={9} style={corner("control", 9)}
            fill="hsl(var(--up))"
            fillOpacity="0.14"
            stroke="hsl(var(--up))"
            strokeOpacity="0.4"
          />
          <path
            d="M 470 244 l 6 -8 l 6 8"
            fill="none"
            stroke="hsl(var(--up))"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Label x={498} y={244} size={12} weight={700} tone="up" anchor="middle">
            UP
          </Label>
        </g>

        <rect
          x={528}
          y={220}
          width={68}
          height={38}
          rx={9} style={corner("control", 9)}
          fill="hsl(var(--down))"
          fillOpacity="0.1"
          stroke="hsl(var(--down))"
          strokeOpacity="0.28"
        />
        <path
          d="M 538 236 l 5 7 l 5 -7"
          fill="none"
          stroke="hsl(var(--down))"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 11px, not 12: "DOWN" is twice the width of "UP" and at 12 it ran
            into its own chevron inside a 68px button. The chevron+label group
            also shifted 2 left so it centres on the button's 562, not 564. */}
        <Label x={570} y={244} size={11} weight={700} tone="down" anchor="middle">
          DOWN
        </Label>
      </Card>

      {/* Settled */}
      <Card x={28} y={308} w={584} h={100}>
        <Label x={52} y={336} size={11} weight={600} tone="ink">
          {t("recent_expiries")}
        </Label>
        {results.map((result) => (
          <g key={result.x}>
            <Well x={result.x} y={322} w={100} h={64} r={7} />
            <Label
              x={result.x + 12}
              y={344}
              size={10}
              weight={700}
              tone={result.dir === "UP" ? "up" : "down"}
            >
              {result.dir}
            </Label>
            <Label
              x={result.x + 12}
              y={366}
              size={12}
              weight={700}
              tone={result.won ? "up" : "down"}
              mono
            >
              {result.value}
            </Label>
          </g>
        ))}
      </Card>

      <Chip x={28} y={430} label={`60s ${tCommon('to_24h')}`} />
      <Chip x={140} y={430} label={t("fixed_payout")} />
      {/* Explicit w: Chip's default width is a CHARACTER COUNT, so a 27-char
          label over-shoots badly — 37 units of side padding against the 20 the
          two pills beside it carry. */}
      <Chip x={266} y={430} w={172} label={t("settles_on_the_candle_close")} tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Ecosystem: your own chain, your own token, and the market that trades it. */
export function EcosystemArt() {
  const t = useTranslations("components");
  const chains = [
    { name: "Ethereum", network: "Mainnet · ERC-20", balance: "4.281" },
    { name: "BNB Chain", network: "Mainnet · BEP-20", balance: "12.40" },
    { name: "Bitcoin", network: "Mainnet · UTXO", balance: "0.0842" },
  ];

  return (
    <Scene label={t("a_native_ecosystem_wallet_across_three")}>
      {/* Wallet */}
      <Card x={28} y={40} w={300} h={236} className="lart-float">
        <Label x={52} y={70} size={13} weight={700} tone="ink">
          {t("native_wallet")}
        </Label>
        <Chip x={257} y={53} label="Live" tone="muted" size={10} />

        {chains.map((chain, i) => {
          const y = 88 + i * 46;
          return (
            <g key={chain.name}>
              <IconTile x={52} y={y} size={34}>
                <circle
                  cx={69}
                  cy={y + 17}
                  r={7}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />
                <circle cx={69} cy={y + 17} r={2.4} fill="hsl(var(--primary))" />
              </IconTile>
              <Label x={96} y={y + 15} size={11} weight={600} tone="ink">
                {chain.name}
              </Label>
              <Label x={96} y={y + 30} size={10}>
                {chain.network}
              </Label>
              <Label x={304} y={y + 22} size={11} weight={700} tone="ink" anchor="end" mono>
                {chain.balance}
              </Label>
            </g>
          );
        })}

        <Well x={52} y={228} w={252} h={32} />
        <Label x={66} y={248} size={10} mono>
          0x7a3f · · · c2e1
        </Label>
        <Label x={290} y={248} size={10} anchor="end" tone="accent" weight={600}>
          Copy
        </Label>
      </Card>

      {/* On-chain market */}
      <Card x={348} y={40} w={264} h={236}>
        <Label x={372} y={70} size={13} weight={700} tone="ink">
          {t("on_chain_market")}
        </Label>
        <Label x={588} y={70} size={10} anchor="end" mono>
          MASH/USDT
        </Label>

        <Curve values={[22, 26, 24, 33, 30, 39, 44, 41, 52, 58]} x={372} y={92} w={216} h={90} />

        <Well x={372} y={196} w={216} h={34} />
        <Label x={384} y={217} size={10}>
          {t("pool_liquidity")}
        </Label>
        <Label x={576} y={217} size={11} weight={700} tone="ink" anchor="end" mono>
          $1.42M
        </Label>

        <Chip x={372} y={240} label={t("your_book_your_fees")} size={10} />
      </Card>

      {/* Deposit path */}
      <Card x={28} y={292} w={584} h={124}>
        <Label x={52} y={320} size={12} weight={700} tone="ink">
          {t("deposits_and_withdrawals")}
        </Label>

        {/* The three-tile run is centred on the card, not on 328: at x=72/308/544
            it sat 44 from the card's left edge and 28 from its right. Every x
            below is that row shifted 8 left, which makes both insets 36. */}
        <IconTile x={64} y={336} size={40}>
          <path
            d="M 76 356 h 16 M 84 348 v 16"
            stroke="hsl(var(--primary))"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </IconTile>
        <Label x={84} y={396} size={10} anchor="middle">
          Chain
        </Label>

        <Flow x1={116} y1={356} x2={288} y2={356} />

        {/* Centred on (320, 356), the tile's middle. A padlock is not symmetric
            about its body — the shackle adds height above it — so centring the
            *rect* left the whole glyph sitting 5 units high in the tile, which
            is visible next to the two symmetric icons either side of it. The
            body is offset down by half the shackle instead. */}
        <IconTile x={300} y={336} size={40}>
          <rect
            x={311}
            y={353}
            width={18}
            height={14}
            rx={3} style={corner("mark", 3)}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          <path d="M 315 353 v -3 a 5 5 0 0 1 10 0 v 3" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
        </IconTile>
        <Label x={320} y={396} size={10} anchor="middle">
          Custody
        </Label>

        <Flow x1={352} y1={356} x2={524} y2={356} delay={0.6} />

        {/* Also centred on its tile. The clasp used to be `M 570 355 h 6`,
            which started inside the body and ran 2 units past its right edge. */}
        <IconTile x={536} y={336} size={40}>
          <rect
            x={545}
            y={348}
            width={22}
            height={16}
            rx={3} style={corner("mark", 3)}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          <circle cx={561} cy={356} r={1.9} fill="hsl(var(--primary))" />
        </IconTile>
        <Label x={556} y={396} size={10} anchor="middle">
          Balance
        </Label>
      </Card>

      <Chip x={28} y={436} label={t("your_chain")} />
      <Chip x={126} y={436} label={t("your_token")} />
      <Chip x={226} y={436} label={t("your_fee_schedule")} tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Multi-asset margin: four classes of instrument on one account. */
export function MultiAssetArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const classes = [
    { label: tCommon("currencies"), symbol: "EUR/USD", change: "+0.24%", up: true },
    { label: t("metals"), symbol: "XAU/USD", change: "+0.81%", up: true },
    { label: t("indices"), symbol: "US500", change: "-0.36%", up: false },
    { label: t("equities"), symbol: "AAPL", change: "+1.12%", up: true },
  ];

  const sessions = [
    { name: "Sydney", hours: "22:00–07:00", live: false },
    { name: "Tokyo", hours: "00:00–09:00", live: false },
    { name: "London", hours: "08:00–17:00", live: true },
    { name: "New York", hours: "13:00–22:00", live: true },
  ];

  return (
    <Scene label={t("one_margin_account_trading_currencies_metals")}>
      {/* Instrument classes */}
      <Card x={28} y={40} w={392} h={236} className="lart-float">
        <Label x={52} y={72} size={14} weight={700} tone="ink">
          {t("one_account")}
        </Label>
        <Label x={52} y={92} size={11}>
          {t("currencies_metals_indices_equities")}
        </Label>

        {classes.map((item, i) => {
          // Pitch 176, not 180: at w=168 the right column has to end on 396 to
          // keep the 24-unit inset the left column has.
          const x = 52 + (i % 2) * 176;
          // 116, not 112: the grid bottomed out at 248 in a card ending at 276,
          // leaving a 28-unit dead band under it against 17 above the title.
          const y = 116 + Math.floor(i / 2) * 72;
          return (
            <g key={item.label}>
              <Well x={x} y={y} w={168} h={64} />
              <Label x={x + 14} y={y + 26} size={11} weight={600} tone="ink">
                {item.label}
              </Label>
              <Label x={x + 14} y={y + 46} size={10} mono>
                {item.symbol}
              </Label>
              <Label
                x={x + 154}
                y={y + 46}
                size={10}
                weight={600}
                tone={item.up ? "up" : "down"}
                anchor="end"
                mono
              >
                {item.change}
              </Label>
            </g>
          );
        })}
      </Card>

      {/* Position */}
      <Card x={436} y={40} w={176} h={236} accent>
        <Label x={452} y={70} size={12} weight={700} tone="ink">
          {t("open_position")}
        </Label>
        <Label x={452} y={90} size={11} mono>
          EUR/USD
        </Label>
        <Chip x={452} y={102} label={t("long_1_0_lot")} size={10} />

        <Well x={452} y={142} w={144} h={34} />
        <Label x={464} y={163} size={10}>
          Margin
        </Label>
        <Label x={584} y={163} size={11} weight={700} tone="ink" anchor="end" mono>
          $1,000
        </Label>

        <Well x={452} y={184} w={144} h={34} />
        <Label x={464} y={205} size={10}>
          Leverage
        </Label>
        <Label x={584} y={205} size={11} weight={700} tone="ink" anchor="end" mono>
          1:500
        </Label>

        <Label x={452} y={248} size={10}>
          Unrealised
        </Label>
        <Label x={596} y={248} size={13} weight={700} tone="up" anchor="end" mono>
          +$248.30
        </Label>
      </Card>

      {/* Sessions */}
      <Card x={28} y={292} w={584} h={124}>
        <Label x={52} y={320} size={12} weight={700} tone="ink">
          Sessions
        </Label>
        <Label x={588} y={320} size={10} anchor="end">
          24 / 5
        </Label>

        {sessions.map((session, i) => {
          // Pitch 136, not 140: four 128-wide wells have to end on 588 to match
          // the "24 / 5" label above, which is anchored there.
          const x = 52 + i * 136;
          return (
            <g key={session.name}>
              {/* 337, not 332: the tiles ended at 390 in a card ending at 416,
                  so a visible empty strip sat under the row. */}
              <Well x={x} y={337} w={128} h={58} />
              <Label x={x + 14} y={361} size={11} weight={600} tone="ink">
                {session.name}
              </Label>
              <Label x={x + 14} y={381} size={10} mono>
                {session.hours}
              </Label>
              {session.live && <Dot cx={x + 112} cy={357} r={3.5} />}
            </g>
          );
        })}
      </Card>

      {/* Gaps were 59 and 33; the x values had drifted off the widths the Chip
          primitive actually derives from the label. Now ~13 and ~12. */}
      <Chip x={28} y={436} label={tCommon("stop_loss_take_profit")} />
      <Chip x={220} y={436} label="Hedging" />
      <Chip x={302} y={436} label={t("negative_balance_protection")} tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/**
 * The platform itself — for the core hero when there is no live market panel to
 * put there (spot switched off, nobody signed in). One wallet, the modules it
 * feeds, and the figure that matters.
 */
export function PlatformArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  /**
   * A glyph each, rather than the same mark four times. Four identical tiles
   * labelled differently reads as a placeholder; the point of the row is that
   * these are *different* products drawing on one balance.
   */
  const stroke = {
    fill: "none",
    stroke: "hsl(var(--primary))",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const modules = [
    {
      label: tCommon("spot"),
      x: 52,
      glyph: (x: number, y: number) => (
        <g {...stroke}>
          <line x1={x + 9} y1={y + 10} x2={x + 9} y2={y + 20} />
          <line x1={x + 15} y1={y + 7} x2={x + 15} y2={y + 23} />
          <line x1={x + 21} y1={y + 12} x2={x + 21} y2={y + 18} />
        </g>
      ),
    },
    {
      label: tCommon("futures"),
      x: 172,
      glyph: (x: number, y: number) => (
        <path d={`M ${x + 8} ${y + 21} L ${x + 22} ${y + 9} M ${x + 16} ${y + 9} L ${x + 22} ${y + 9} L ${x + 22} ${y + 15}`} {...stroke} />
      ),
    },
    {
      label: tCommon("staking"),
      x: 292,
      // A stack of coins. A circle with a slash through it — the obvious
      // "percent" shorthand — draws the no-entry sign at this size.
      glyph: (x: number, y: number) => (
        <g {...stroke}>
          <ellipse cx={x + 15} cy={y + 10} rx={7} ry={3} />
          <path d={`M ${x + 8} ${y + 10} v 4 a 7 3 0 0 0 14 0 v -4`} />
          <path d={`M ${x + 8} ${y + 16} v 4 a 7 3 0 0 0 14 0 v -4`} />
        </g>
      ),
    },
    {
      label: "P2P",
      x: 412,
      glyph: (x: number, y: number) => (
        <g {...stroke}>
          <path d={`M ${x + 8} ${y + 12} h 12 M ${x + 16} ${y + 8} l 4 4 l -4 4`} />
          <path d={`M ${x + 22} ${y + 20} h -12 M ${x + 14} ${y + 16} l -4 4 l 4 4`} />
        </g>
      ),
    },
  ];

  return (
    <Scene label={t("a_single_funded_account_feeding_every")}>
      {/* Account */}
      <Card x={28} y={40} w={392} h={200} className="lart-float">
        <Label x={52} y={72} size={12} weight={700} tone="ink">
          {t("account_balance")}
        </Label>
        <Dot cx={396} cy={68} r={4} />

        <Label x={52} y={118} size={34} weight={700} tone="ink" mono>
          $48,209.40
        </Label>
        <Label x={52} y={142} size={11} tone="up" weight={600} mono>
          +6.2% this month
        </Label>

        <Bars
          values={[22, 34, 28, 44, 38, 52, 47, 61, 55, 68, 62, 76]}
          x={52}
          y={158}
          w={344}
          h={54}
        />
      </Card>

      {/* Headline figure */}
      <Card x={436} y={40} w={176} h={200} accent>
        <Label x={524} y={72} size={11} anchor="middle">
          {t("portfolio_allocated")}
        </Label>
        <Ring cx={524} cy={144} r={44} value={0.68}>
          <Label x={524} y={143} size={24} weight={700} tone="ink" anchor="middle" mono>
            68%
          </Label>
          <Label x={524} y={160} size={10} anchor="middle">
            {tCommon("of_balance")}
          </Label>
        </Ring>
        <Label x={524} y={218} size={10} anchor="middle">
          {t("rebalanced_daily")}
        </Label>
      </Card>

      {/* One wallet, every module */}
      <Card x={28} y={256} w={584} h={160}>
        <Label x={52} y={282} size={12} weight={700} tone="ink">
          {t("one_wallet_every_module")}
        </Label>

        {modules.map((module) => (
          <g key={module.label}>
            <Well x={module.x} y={294} w={104} h={70} />
            <IconTile x={module.x + 12} y={306} size={30}>
              {module.glyph(module.x + 12, 306)}
            </IconTile>
            <Label x={module.x + 12} y={356} size={10} weight={600} tone="ink">
              {module.label}
            </Label>
          </g>
        ))}

        <Well x={532} y={294} w={56} h={70} />
        <Label x={560} y={326} size={10} anchor="middle">
          and
        </Label>
        <Label x={560} y={344} size={13} weight={700} tone="accent" anchor="middle" mono>
          12+
        </Label>

        <Label x={52} y={386} size={10}>
          {t("balance_in_use")}
        </Label>
        <Label x={588} y={386} size={10} weight={600} tone="ink" anchor="end" mono>
          74%
        </Label>
        <Meter x={52} y={394} w={536} value={0.74} animate />
      </Card>

      <Chip x={28} y={436} label={t("one_balance")} />
      <Chip x={140} y={436} label={t("one_kyc")} />
      <Chip x={228} y={436} label={t("one_set_of_fees")} tone="muted" />
    </Scene>
  );
}
