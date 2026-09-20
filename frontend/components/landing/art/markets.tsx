"use client";

/**
 * Marketplace-side illustrations: a trade between two people, a token sale, a
 * storefront, a payment rail, a collectible listing.
 */

import React from "react";
import { Avatar, Bars, Card, Chip, Curve, Dot, Flow, IconTile, Label, Link2, Meter, Ring, Scene, Well, corner } from "./scene";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------

/** P2P: buyer and seller either side of escrow, which is the whole product. */
export function P2PArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("a_peer_to_peer_trade_with")}>
      <Card x={28} y={44} w={244} h={132}>
        {/* cx=74 puts the avatar's left edge on 52, the same content column the
            Well below it sets. At 68 it was outdented 6 units. */}
        <Avatar cx={74} cy={86} r={22} />
        <Label x={108} y={80} size={13} weight={700} tone="ink">
          Buyer
        </Label>
        <Label x={108} y={98} size={10}>
          {`348 ${tCommon('trades_49_rating')}`}
        </Label>
        <Well x={52} y={120} w={196} h={38} />
        <Label x={66} y={136} size={10}>
          {t("paying_with")}
        </Label>
        <Label x={66} y={152} size={12} weight={700} tone="ink">
          {t("bank_transfer_eur")}
        </Label>
      </Card>

      <Card x={368} y={44} w={244} h={132}>
        <Avatar cx={414} cy={86} r={22} tone="muted" />
        <Label x={448} y={80} size={13} weight={700} tone="ink">
          Seller
        </Label>
        <Label x={448} y={98} size={10}>
          99.8% completion
        </Label>
        <Well x={392} y={120} w={196} h={38} />
        <Label x={406} y={136} size={10}>
          Releasing
        </Label>
        <Label x={406} y={152} size={12} weight={700} tone="ink" mono>
          1,250.00 USDT
        </Label>
      </Card>

      {/* Escrow */}
      <Flow x1={280} y1={110} x2={296} y2={110} />
      <Flow x1={344} y1={110} x2={360} y2={110} delay={0.7} />
      <g className="lart-breathe">
        <circle cx={320} cy={110} r={30} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeOpacity="0.55" strokeWidth="2" />
        <path
          d="M 320 93 l 14 6 v 13 q 0 13 -14 19 q -14 -6 -14 -19 v -13 z"
          fill="hsl(var(--primary))"
          fillOpacity="0.18"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />
        <path d="M 313 111 l 5 5 l 9 -11" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <Card x={28} y={204} w={584} h={92} accent>
        <IconTile x={52} y={230} size={40}>
          <path
            d="M 65 250 v -5 a 7 7 0 0 1 14 0 v 5 m -18 0 h 22 v 15 h -22 z"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconTile>
        <Label x={108} y={244} size={15} weight={700} tone="ink" mono>
          {t("n_1_250_usdt_locked_in_escrow")}
        </Label>
        <Label x={108} y={266} size={11}>
          {t("released_automatically_the_moment_payment_is")}
        </Label>
        <Dot cx={584} cy={250} r={5} />
      </Card>

      {/* Timeline */}
      <Card x={28} y={316} w={584} h={100}>
        {[
          { x: 84, label: t("offer_matched"), done: true },
          { x: 234, label: t("funds_escrowed"), done: true },
          { x: 384, label: tCommon("payment_sent"), done: true },
          { x: 534, label: tCommon("released"), done: false },
        ].map((s, i) => (
          <g key={s.label}>
            {i < 3 && <Link2 d={`M ${s.x + 16} 356 H ${s.x + 134}`} dashed={i === 2} />}
            <circle
              cx={s.x}
              cy={356}
              r={13}
              fill={s.done ? "hsl(var(--primary))" : "hsl(var(--surface-3))"}
              stroke={s.done ? "hsl(var(--primary))" : "hsl(var(--border-strong))"}
              strokeWidth="1.5"
            />
            {s.done && (
              <path
                d={`M ${s.x - 5} 356 l 4 4 l 7 -8`}
                fill="none"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <Label x={s.x} y={390} size={10} anchor="middle" tone={s.done ? "ink" : "subtle"} weight={s.done ? 600 : 500}>
              {s.label}
            </Label>
          </g>
        ))}
      </Card>

      <Chip x={28} y={444} label={tCommon("any_payment_method")} />
      <Chip x={186} y={444} label={tCommon("dispute_resolution")} tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Token sale: how much is raised, which phase, and where the supply goes. */
export function IcoArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("a_token_sale_showing_amount_raised")}>
      <Card x={28} y={40} w={392} h={176} accent className="lart-float">
        <IconTile x={52} y={64} size={38}>
          <circle cx={71} cy={83} r={11} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.2" />
          <path d="M 71 76 v 14 M 67 80 h 8 M 67 86 h 8" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
        </IconTile>
        <Label x={102} y={78} size={14} weight={700} tone="ink">
          {t("nova_token_sale")}
        </Label>
        <Label x={102} y={96} size={11}>
          {t("phase_2_of_4_public_round")}
        </Label>
        <Chip x={324} y={70} label="Live" tone="accent" size={10} />

        <Label x={52} y={134} size={11}>
          Raised
        </Label>
        <Label x={396} y={134} size={11} anchor="end">
          Target $4.0M
        </Label>
        {/* The whole raised block sits 6 higher: the caption row's text box ended
            9.5 off the card's 216 bottom against 23 above the title. */}
        <Label x={52} y={160} size={30} weight={700} tone="ink" mono>
          $2,840,000
        </Label>
        <Meter x={52} y={176} w={344} value={0.71} h={10} animate />
        <Label x={52} y={198} size={10} tone="accent" weight={600}>
          71% funded
        </Label>
        <Label x={396} y={198} size={10} anchor="end">
          {t("closes_in_12d_06h")}
        </Label>
      </Card>

      <Card x={436} y={40} w={176} h={176}>
        <Label x={460} y={66} size={11}>
          {tCommon("token_price")}
        </Label>
        <Label x={460} y={92} size={22} weight={700} tone="ink" mono>
          $0.085
        </Label>
        <Chip x={460} y={104} label="+21% vs seed" tone="up" size={10} />
        <line x1={460} y1={144} x2={588} y2={144} stroke="hsl(var(--border))" />
        <Label x={460} y={166} size={10}>
          {t("min_contribution")}
        </Label>
        <Label x={460} y={186} size={13} weight={700} tone="ink" mono>
          $250
        </Label>
        <Label x={460} y={206} size={10}>
          {t("vesting_6_month_linear")}
        </Label>
      </Card>

      {/* Phases */}
      <Card x={28} y={240} w={392} h={156}>
        <Label x={52} y={266} size={12} weight={700} tone="ink">
          {t("sale_phases")}
        </Label>
        {[
          { n: "Seed", p: "$0.045", state: "Closed", done: true },
          { n: "Public", p: "$0.085", state: "Open", done: false, active: true },
          { n: "Growth", p: "$0.120", state: "Upcoming", done: false },
        ].map((ph, i) => (
          <g key={ph.n}>
            <Well x={52} y={280 + i * 36} w={344} h={28} />
            <circle
              cx={70}
              cy={294 + i * 36}
              r={6}
              fill={ph.done || ph.active ? "hsl(var(--primary))" : "hsl(var(--surface-3))"}
            />
            <Label x={88} y={298 + i * 36} size={11} weight={600} tone={ph.active ? "ink" : "muted"}>
              {ph.n}
            </Label>
            <Label x={240} y={298 + i * 36} size={11} tone="ink" anchor="end" mono>
              {ph.p}
            </Label>
            <Label x={384} y={298 + i * 36} size={10} anchor="end" tone={ph.active ? "accent" : "subtle"} weight={600}>
              {ph.state}
            </Label>
          </g>
        ))}
      </Card>

      {/* Allocation */}
      <Card x={436} y={240} w={176} h={156}>
        <Label x={460} y={266} size={12} weight={700} tone="ink">
          Allocation
        </Label>
        <Ring cx={524} cy={330} r={40} value={0.62} width={12}>
          <Label x={524} y={328} size={17} weight={700} tone="ink" anchor="middle" mono>
            62%
          </Label>
          <Label x={524} y={344} size={9} anchor="middle">
            public
          </Label>
        </Ring>
      </Card>

      <Chip x={28} y={424} label={t("kyc_verified_issuers")} tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Storefront: catalogue, cart, and where the order is. */
export function EcommerceArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("an_online_storefront_showing_product_listings")}>
      {/* Catalogue */}
      {[0, 1, 2].map((i) => (
        <Card key={i} x={28 + i * 148} y={40} w={132} h={168} className="lart-float" style={{ animationDelay: `${i * 0.5}s` }}>
          <rect x={44 + i * 148} y={56} width={100} height={72} rx={9} style={corner("inset", 9)} fill="hsl(var(--surface-2))" />
          <path
            d={`M ${56 + i * 148} 116 l 16 -20 l 13 14 l 10 -12 l 15 18 z`}
            fill="hsl(var(--primary))"
            fillOpacity="0.35"
          />
          <circle cx={70 + i * 148} cy={74} r={6} fill="hsl(var(--primary))" fillOpacity="0.5" />
          <Label x={44 + i * 148} y={148} size={11} weight={600} tone="ink">
            Product {i + 1}
          </Label>
          <Label x={44 + i * 148} y={166} size={12} weight={700} tone="ink" mono>
            ${(29 + i * 20).toFixed(2)}
          </Label>
          <Label x={144 + i * 148} y={166} size={10} tone="accent" anchor="end" weight={600}>
            Add
          </Label>
          <Label x={44 + i * 148} y={186} size={9} tone="subtle">
            ★★★★★ · {12 + i * 9} reviews
          </Label>
        </Card>
      ))}

      {/* Cart */}
      <Card x={472} y={40} w={140} h={168} accent>
        <IconTile x={492} y={60} size={34}>
          <path
            d="M 500 72 h 4 l 3 14 h 12 l 3 -10 h -16"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={509} cy={91} r="2" fill="hsl(var(--primary))" />
          <circle cx={518} cy={91} r="2" fill="hsl(var(--primary))" />
        </IconTile>
        <Label x={536} y={82} size={12} weight={700} tone="ink">
          {t("cart")} 3
        </Label>
        {/* The whole stack below the rule is tightened so the Checkout pill ends
            at 188 — 20 inside the card's 208 bottom, matching the 20 it already
            keeps on the other three sides. At y=190 the pill ran to 216 and
            punched straight through the card's border and rounded corners. */}
        <line x1={492} y1={104} x2={592} y2={104} stroke="hsl(var(--border))" />
        {[
          { k: "Subtotal", v: "$118.00" },
          { k: "Shipping", v: "$6.00" },
        ].map((r, i) => (
          <g key={r.k}>
            <Label x={492} y={118 + i * 16} size={10}>
              {r.k}
            </Label>
            <Label x={592} y={118 + i * 16} size={10} tone="ink" anchor="end" mono>
              {r.v}
            </Label>
          </g>
        ))}
        {/* 22 below the last line, not 16: "$124.00" is 15px against the rows'
            10px, so an even pitch crowds it. */}
        <Label x={492} y={156} size={11} weight={600} tone="ink">
          Total
        </Label>
        <Label x={592} y={156} size={15} weight={700} tone="ink" anchor="end" mono>
          $124.00
        </Label>
        <rect x={492} y={164} width={100} height={24} rx={7} style={corner("control", 7)} fill="hsl(var(--primary))" />
        <Label x={542} y={180} size={11} weight={700} anchor="middle">
          <tspan fill="hsl(var(--primary-foreground))">Checkout</tspan>
        </Label>
      </Card>

      {/* Order status */}
      <Card x={28} y={240} w={584} h={112}>
        <Label x={52} y={268} size={12} weight={700} tone="ink">
          Order #4812
        </Label>
        <Chip x={148} y={252} label={tCommon("in_transit")} tone="accent" size={10} />
        <Label x={588} y={268} size={10} anchor="end">
          {t("est_delivery_thursday")}
        </Label>
        {[
          // Uniform 160 pitch. It used to be 164/164/136, so the last step sat
          // 28 units closer to its neighbour than the other three.
          { x: 80, label: t("paid"), done: true },
          { x: 240, label: t("packed"), done: true },
          { x: 400, label: tCommon("shipped"), done: true },
          { x: 560, label: tCommon("delivered"), done: false },
        ].map((s, i) => (
          <g key={s.label}>
            {i < 3 && <Link2 d={`M ${s.x + 14} 306 H ${s.x + 146}`} dashed={i === 2} />}
            <circle
              cx={s.x}
              cy={306}
              r={11}
              fill={s.done ? "hsl(var(--primary))" : "hsl(var(--surface-3))"}
              stroke={s.done ? "hsl(var(--primary))" : "hsl(var(--border-strong))"}
              strokeWidth="1.5"
            />
            {s.done && (
              <path
                d={`M ${s.x - 4} 306 l 3 3 l 6 -7`}
                fill="none"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <Label x={s.x} y={334} size={10} anchor="middle" tone={s.done ? "ink" : "subtle"}>
              {s.label}
            </Label>
          </g>
        ))}
      </Card>

      {/* Revenue */}
      <Card x={28} y={376} w={584} h={92}>
        <Label x={52} y={402} size={10}>
          {t("revenue_last_30_days")}
        </Label>
        <Label x={52} y={430} size={20} weight={700} tone="ink" mono>
          $48,210
        </Label>
        {/* Beside the figure, not under it: at y=440 the pill cleared the card's
            bottom edge by 5 where every other side of this card uses 20. */}
        <Chip x={152} y={411} label="+12.4%" tone="up" size={10} />
        <Bars values={[6, 9, 7, 12, 10, 14, 11, 16, 13, 18, 15, 21]} x={300} y={396} w={288} h={52} tone="accent" />
      </Card>
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** Payment gateway: many ways in, one settlement out. */
export function GatewayArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("a_payment_gateway_accepting_card_bank")}>
      {/* Inputs */}
      {[
        { y: 52, label: tCommon("card"), detail: "Visa · Mastercard" },
        { y: 140, label: tCommon("bank_transfer"), detail: "SEPA · ACH · Wire" },
        { y: 228, label: tCommon("crypto"), detail: "BTC · ETH · USDT" },
      ].map((m, i) => (
        <Card key={m.label} x={28} y={m.y} w={188} h={72}>
          <IconTile x={48} y={m.y + 18} size={36}>
            <rect x={57} y={m.y + 30} width={18} height={13} rx={2.5} style={corner("mark", 2.5)} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
            <path d={`M 57 ${m.y + 35} h 18`} stroke="hsl(var(--primary))" strokeWidth="2" />
          </IconTile>
          <Label x={94} y={m.y + 34} size={12} weight={700} tone="ink">
            {m.label}
          </Label>
          <Label x={94} y={m.y + 50} size={10}>
            {m.detail}
          </Label>
          <Flow x1={222} y1={m.y + 36} x2={272} y2={176} delay={i * 0.6} />
        </Card>
      ))}

      {/* Gateway node.
          Centred on 176, not 186: the three input cards centre on 88/176/264, so
          a hub at 186 made the middle "straight-through" flow tilt by 10 and the
          fan asymmetric. The hub, its captions and the settlement card all moved
          up 10 — the input column's own rhythm (52 / 16 / 16) is the correct one
          and is left untouched. */}
      <g className="lart-breathe">
        <circle cx={320} cy={176} r={46} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeOpacity="0.5" strokeWidth="2" />
        <circle className="lart-spin" cx={320} cy={176} r={58} fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="8 12" />
        <path
          d="M 306 170 h 28 M 306 182 h 28"
          stroke="hsl(var(--primary))"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path d="M 328 162 l 8 8 l -8 8" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 312 190 l -8 -8 l 8 -8" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Label x={320} y={252} size={11} weight={700} tone="ink" anchor="middle">
        Gateway
      </Label>
      <Label x={320} y={268} size={10} anchor="middle">
        {t("routing_fx_fraud_checks")}
      </Label>

      <Flow x1={382} y1={176} x2={420} y2={176} delay={0.3} />

      {/* Settlement */}
      <Card x={428} y={86} w={184} h={180} accent className="lart-float">
        <Label x={452} y={114} size={11}>
          {t("settled_balance")}
        </Label>
        <Label x={452} y={144} size={26} weight={700} tone="ink" mono>
          $86,420
        </Label>
        <Chip x={452} y={156} label={t("auto_payout_daily")} size={10} />
        <line x1={452} y1={196} x2={588} y2={196} stroke="hsl(var(--border))" />
        <Curve values={[12, 16, 14, 22, 19, 27, 25, 33, 38]} x={452} y={206} w={136} h={44} marker={false} />
      </Card>

      {/* Ledger */}
      <Card x={28} y={320} w={584} h={104}>
        <Label x={52} y={346} size={12} weight={700} tone="ink">
          {t("recent_settlements")}
        </Label>
        <Label x={588} y={346} size={10} anchor="end">
          Fee 0.9% + $0.20
        </Label>
        {[
          // Pitch 136, not 140: at w=128 the four wells have to end on 588 to
          // keep the 24-unit inset the header uses. At 140 the last one ran to
          // 600 and the row sat 24 from the left but 12 from the right.
          { x: 52, cur: "USD", amt: "12,480.00" },
          { x: 188, cur: "EUR", amt: "8,215.40" },
          { x: 324, cur: "GBP", amt: "5,062.10" },
          { x: 460, cur: "USDT", amt: "21,900.00" },
        ].map((r) => (
          <g key={r.cur}>
            {/* 362, not 358: the wells ended at 402 in a card ending at 424,
                leaving 22 units of dead band under the row against 13 above it. */}
            <Well x={r.x} y={362} w={128} h={44} />
            <Label x={r.x + 14} y={380} size={10} tone="accent" weight={700}>
              {r.cur}
            </Label>
            <Label x={r.x + 14} y={397} size={11} weight={600} tone="ink" mono>
              {r.amt}
            </Label>
          </g>
        ))}
      </Card>

      <Chip x={28} y={448} label={t("webhooks_api_keys")} tone="muted" />
    </Scene>
  );
}

// ---------------------------------------------------------------------------

/** NFT: a listing with its bid history and the collection it belongs to. */
export function NftArt() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Scene label={t("an_nft_listing_with_its_current")}>
      {/* Artwork */}
      <Card x={28} y={40} w={252} h={288} className="lart-float">
        <rect x={48} y={60} width={212} height={188} rx={12} style={corner("inset", 12)} fill="hsl(var(--surface-2))" />
        <g className="lart-spin">
          {/* The tile is 60..248, so its centre is 154. The glyph used to be
              built around 160 — 6 units low, which also put the spin origin off
              the tile centre. Every y here is that 6 taken back out. */}
          <polygon points="154,98 200,126 200,182 154,210 108,182 108,126" fill="hsl(var(--primary))" fillOpacity="0.22" stroke="hsl(var(--primary))" strokeWidth="2" />
        </g>
        <polygon points="154,121 182,137 182,171 154,187 126,171 126,137" fill="hsl(var(--primary))" fillOpacity="0.45" />
        <circle className="lart-blink" cx={154} cy={154} r={9} fill="hsl(var(--primary))" />
        <Label x={48} y={276} size={13} weight={700} tone="ink">
          Prism #0412
        </Label>
        <Label x={48} y={294} size={10}>
          {t("prism_collective_1_of_5_000")}
        </Label>
        <Chip x={196} y={280} label="Rare" size={10} />
      </Card>

      {/* Bid panel */}
      <Card x={300} y={40} w={312} h={148} accent>
        <Label x={324} y={68} size={11}>
          {tCommon("current_bid")}
        </Label>
        <Label x={324} y={100} size={28} weight={700} tone="ink" mono>
          4.85 ETH
        </Label>
        <Label x={324} y={120} size={11}>
          ≈ $11,240
        </Label>
        <Label x={588} y={68} size={10} anchor="end">
          {tCommon("ends_in")}
        </Label>
        <Label x={588} y={92} size={18} weight={700} tone="ink" anchor="end" mono>
          06:12:44
        </Label>
        <Dot cx={584} cy={110} r={4} />
        <rect x={324} y={138} width={124} height={32} rx={8} style={corner("control", 8)} fill="hsl(var(--primary))" />
        <Label x={386} y={159} size={12} weight={700} anchor="middle">
          <tspan fill="hsl(var(--primary-foreground))">{tCommon("place_bid")}</tspan>
        </Label>
        <rect x={460} y={138} width={128} height={32} rx={8} style={corner("control", 8)} fill="hsl(var(--surface-2))" stroke="hsl(var(--border))" />
        <Label x={524} y={159} size={12} weight={600} tone="ink" anchor="middle">
          {tCommon("make_offer")}
        </Label>
      </Card>

      {/* Bid history */}
      <Card x={300} y={204} w={312} h={124}>
        <Label x={324} y={230} size={12} weight={700} tone="ink">
          {tCommon("bid_history")}
        </Label>
        {[
          { by: "0x7a…c41", amt: "4.85 ETH", t: "2m ago" },
          { by: "0x19…8ba", amt: "4.60 ETH", t: "18m ago" },
          { by: "0xf3…207", amt: "4.20 ETH", t: "1h ago" },
        ].map((b, i) => (
          <g key={b.by}>
            <Avatar cx={333} cy={256 + i * 26} r={9} tone={i === 0 ? "accent" : "muted"} />
            <Label x={351} y={260 + i * 26} size={10} tone="ink" mono>
              {b.by}
            </Label>
            <Label x={498} y={260 + i * 26} size={10} weight={600} tone={i === 0 ? "accent" : "ink"} anchor="end" mono>
              {b.amt}
            </Label>
            <Label x={588} y={260 + i * 26} size={10} anchor="end">
              {b.t}
            </Label>
          </g>
        ))}
      </Card>

      {/* Collection stats */}
      <Card x={28} y={352} w={584} h={92}>
        {[
          { x: 52, k: "Floor price", v: "3.10 ETH" },
          { x: 196, k: "24h volume", v: "412 ETH" },
          { x: 340, k: "Owners", v: "2,884" },
          { x: 484, k: "Listed", v: "6.2%" },
        ].map((s) => (
          <g key={s.k}>
            <Label x={s.x} y={384} size={10}>
              {s.k}
            </Label>
            <Label x={s.x} y={408} size={17} weight={700} tone="ink" mono>
              {s.v}
            </Label>
          </g>
        ))}
        <Meter x={52} y={424} w={536} value={0.062} h={4} />
      </Card>
    </Scene>
  );
}
