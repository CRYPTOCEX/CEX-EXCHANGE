/**
 * seed-docs-commerce — fill the COMMERCE screens that photographed empty.
 *
 *   cd C:/xampp/htdocs/v5/backend
 *   npx tsx -r dotenv/config scripts/seed-docs-commerce.ts dotenv_config_path=../.env
 *   npx tsx -r dotenv/config scripts/seed-docs-commerce.ts dotenv_config_path=../.env --undo
 *   npx tsx -r dotenv/config scripts/seed-docs-commerce.ts dotenv_config_path=../.env --verify
 *
 * ---------------------------------------------------------------------------
 * WHY
 * ---------------------------------------------------------------------------
 * A documentation screenshot pass photographed 302 screens; eight of the
 * commerce ones came back holding nothing but their own empty state:
 *
 *   /admin/ecommerce/review   "Product User Rating Status Actions  No data available"
 *   /ecommerce/order          "Products Order status Total Amount Order Date  No data"
 *   /ecommerce/shipping       "No shipments found"
 *   /admin/nft                "Dispute flow ... No data available"  (all five queues 0)
 *   /admin/nft/analytics      "Trading Volume  No data available"
 *   /ico/transaction          "No data available"
 *   /affiliate/reward         "No rewards found"
 *   /copy-trading/trade       "No trades found"
 *
 * Every one of them is a live route over a real table. NOT ONE of them was
 * empty because the feature is unwired — the rows simply belonged to other
 * accounts, or sat outside the window the page asks for. Each area below opens
 * with the specific reason, because that reason is what decides where the rows
 * have to go.
 *
 * ---------------------------------------------------------------------------
 * THE SEED IS WRITTEN FOR THE THREE ACCOUNTS THE SCREENSHOTS ARE TAKEN AS
 * ---------------------------------------------------------------------------
 *   CUSTOMER      ava.thornton@example.com    <- the star of every user page
 *   OPERATOR      ops.demo@example.com        <- Super Admin, the admin pages
 *   COUNTERPARTY  liam.osei@example.com       <- the other side; never shot
 *
 * created by scripts/seed-docs-demo.ts. This script REQUIRES them and refuses
 * to run without them, because putting commerce rows anywhere else produces a
 * database that has data and screenshots that still do not.
 *
 * `johndoe3dmodeller@gmail.com` — the owner's real account — is never read,
 * written or referenced. That is not only a privacy rule here; it changed the
 * SHAPE of the copy-trading seed. The only `copy_trading_leaders` row on this
 * box belongs to that account, so having Ava follow it would have put the
 * owner's display name and avatar into a customer-facing screenshot. Liam is
 * stood up as a second leader instead, and Ava follows him.
 *
 * ---------------------------------------------------------------------------
 * IDEMPOTENT AND REVERSIBLE BY CONSTRUCTION
 * ---------------------------------------------------------------------------
 * Every row written here has a primary key of the shape
 *
 *     dc0e<area>-0000-4000-8000-<12 digits>
 *
 * `dc0e` = docs-commerce. Nothing else in this database uses that prefix, so
 * the script can always enumerate its own rows and can never name anybody
 * else's: `--undo` is a `DELETE ... WHERE id LIKE 'dc0e%-0000-4000-8000-%'` per
 * table in reverse dependency order, and a re-run purges before it writes.
 *
 * There are exactly TWO writes outside that namespace, both recorded and both
 * restored by `--undo`:
 *
 *   1. `ico_token_offering.participants` on the two offerings Ava buys into.
 *      It is a STORED counter that `ico/transaction/index.post.ts` increments
 *      per new participant; leaving it alone would print "6 participants" over
 *      a list containing seven. It is RECOUNTED from the transactions rather
 *      than incremented, so a half-finished run cannot leave it drifting.
 *   2. `exchange_currency.price` for ETH and BNB — see THE MARKETPLACE RATES
 *      below.
 *
 * No user row, no setting other than the rate backup, no wallet, no balance.
 *
 * ---------------------------------------------------------------------------
 * THE MARKETPLACE RATES — a real edit outside the namespace, stated plainly
 * ---------------------------------------------------------------------------
 * `/admin/nft/analytics` prints "Trading Volume $0.00" for TWO independent
 * reasons, and seeding rows fixes only one of them:
 *
 *   (a) every `nft_sale` row on this box predates the 30-day window; and
 *   (b) `exchange_currency` holds ETH with `price = NULL`, and this whole
 *       marketplace is denominated in ETH.
 *
 * `getUsdRates` -> `getSpotPricesInUSD` reads that column, `Number(null)` is 0,
 * and the analytics route treats a non-positive rate as NO RATE — correctly; it
 * refuses to value ETH at nothing. So sales alone would have rendered the chart
 * (its guard is `volumeChart.some(p => p.sales > 0)`) as a FLAT ZERO LINE under
 * a heading that says Trading Volume, beside a banner reading "volume excludes
 * unpriced currencies: ETH". That is a worse photograph than the empty state.
 *
 * BNB is in the same state and reaches the same banner through the pre-existing
 * CyberFeline collection's floor price, so it is priced too. Nothing here sells
 * in BNB; the defect is in the rate table, not in anyone's listings.
 *
 * These are market data, not money: no balance, no ledger, no order. `status`
 * is left alone (both stay disabled for trading), the write happens ONLY where
 * the stored price is NULL or <= 0, and the previous values are parked in one
 * settings row so `--undo` restores exactly what was found.
 *
 * NOTE ON THE FIGURE THE PAGE PRINTS. `exchange_currency.price` is denominated
 * in USDT, and `getSpotPricesInUSD` scales the whole table by the live USDT/USD
 * rate. So a 3150 stored here surfaces as ~3148 on the page and the volume is
 * ~0.06% under the ETH x 3150 arithmetic. `--verify` therefore states the
 * stored-rate figure as an approximation rather than pretending the two are the
 * same number.
 *
 * ---------------------------------------------------------------------------
 * THE NUMBERS ADD UP
 * ---------------------------------------------------------------------------
 * These are screenshots of a financial product, so nothing here is a magic
 * number typed into a total:
 *
 *   - Every e-commerce order states only its LINES, its discount and its
 *     shipping cost. `subtotal` is SUM(unit price x qty) over those lines,
 *     `tax` is 8% of (subtotal - discount), and
 *     `total = subtotal - discount + shippingCost + tax`.
 *   - Every shipment's `weight` and `volume` are summed from the physical lines
 *     of the order it carries, and its `cost` IS that order's `shippingCost`.
 *     Its `tax` is 0 on purpose: the goods tax lives on the order, and printing
 *     it again on the shipment would make the two pages disagree.
 *   - Each ICO transaction's `price` is the tokenPrice of the PHASE it is filed
 *     under — the view dialog prints "Total paid" as amount x price, so a price
 *     that disagrees with its phase is a lie a reader can catch.
 *   - Every NFT sale's `netAmount` is `price - marketplaceFee - royaltyFee`,
 *     with the fees taken at the marketplace's 2.5% and the collection's own
 *     declared 5% royalty.
 *   - Every closed copy trade's `profitPercent` is `profit / cost * 100`, so
 *     the row can be checked against itself, and the page's Win Rate and Total
 *     Profit cards are recomputed here from the same rows the route recomputes
 *     them from.
 *
 * `--verify` re-reads all of it from the database and re-checks every one of
 * those identities. The seed refuses to finish if any of them fails.
 */

import { models, sequelize } from "@b/db";
import { Op, QueryTypes } from "sequelize";

const MODE_UNDO = process.argv.includes("--undo");
const MODE_VERIFY = process.argv.includes("--verify");

/** The one account that must never be read, written or photographed. */
const FORBIDDEN_EMAIL = "johndoe3dmodeller@gmail.com";

const log = (msg: string) => console.log(msg);

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

const ID_PREFIX = "dc0e";
const ID_LIKE = "dc0e%-0000-4000-8000-%";

/** `dc0e<area>-0000-4000-8000-<n>` — see the header. */
function cid(area: string, n: number): string {
  return `${ID_PREFIX}${area}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const A_REVIEW = "0001";
const A_ORDER = "0002";
const A_NFT = "0003";
const A_ICO = "0004";
const A_AFFIL = "0005";
const A_COPY = "0006";

const NOW = Date.now();
const DAY = 86_400_000;
const HOUR = 3_600_000;
const ago = (d: number, h = 0) => new Date(NOW - d * DAY - h * HOUR);
const ahead = (d: number, h = 0) => new Date(NOW + d * DAY + h * HOUR);

/** Money rounding. Every figure that reaches a screen goes through this. */
const money = (n: number) => Math.round(n * 100) / 100;
/** Crypto rounding, at the precision the DECIMAL(36,18) columns are read at. */
const coin = (n: number) => Math.round(n * 1e8) / 1e8;

// ---------------------------------------------------------------------------
// Personas and the pre-existing rows this seed hangs off
// ---------------------------------------------------------------------------

const EMAIL_CUSTOMER = "ava.thornton@example.com";
const EMAIL_OPERATOR = "ops.demo@example.com";
const EMAIL_COUNTERPARTY = "liam.osei@example.com";

/**
 * The twelve `@example.com` shoppers seeded by `seed-docs-products.ts`. They
 * are the OTHER reviewers on the admin reviews desk and the other side of the
 * NFT sales — a moderation table with one name in it does not read as a
 * moderation table.
 */
const CROWD_IDS = Array.from(
  { length: 12 },
  (_, i) => `d0c90001-0000-4000-8000-${String(i + 1).padStart(12, "0")}`
);

/** Catalogue rows from `seed-docs-products.ts` that this seed sells. */
const PRODUCTS = {
  wallet: {
    id: "d0c90007-0000-4000-8000-000000000041",
    price: 129,
    currency: "USD",
    walletType: "FIAT",
    physical: true,
    kg: 0.35,
    m3: 0.004,
  },
  plate: {
    id: "d0c90007-0000-4000-8000-000000000042",
    price: 45,
    currency: "USD",
    walletType: "FIAT",
    physical: true,
    kg: 0.9,
    m3: 0.002,
  },
  course: {
    id: "d0c90007-0000-4000-8000-000000000043",
    price: 89,
    currency: "USD",
    walletType: "FIAT",
    physical: false,
    kg: 0,
    m3: 0,
  },
  tracker: {
    id: "d0c90007-0000-4000-8000-000000000044",
    price: 59,
    currency: "USDT",
    walletType: "SPOT",
    physical: false,
    kg: 0,
    m3: 0,
  },
} as const;

/** ICO offerings + phases from `seed-docs-products.ts`. */
const OFFERING_AUR = "d0c90004-0000-4000-8000-000000000001"; // ACTIVE
const OFFERING_NWC = "d0c90004-0000-4000-8000-000000000002"; // SUCCESS
const PHASE = {
  aurSeed: { id: "d0c90004-0000-4000-8000-000000000210", price: 0.03 },
  aurPrivate: { id: "d0c90004-0000-4000-8000-000000000211", price: 0.04 },
  aurPublic: { id: "d0c90004-0000-4000-8000-000000000212", price: 0.045 },
  nwcStrategic: { id: "d0c90004-0000-4000-8000-000000000220", price: 0.1 },
  nwcPublic: { id: "d0c90004-0000-4000-8000-000000000221", price: 0.12 },
} as const;

/** Affiliate conditions this install ships. All FIAT/USD, so the rate is 1. */
const CONDITION = {
  deposit: "0e6f1442-e9e3-4dad-aaf2-bce599f486e9",
  welcome: "c1df2237-8517-497b-b486-a4443aba5a19",
  firstDeposit: "d0de7cc1-563c-4677-9c9b-2ba49bcab25a",
  tradeCommission: "00092b75-a9a7-4b41-9a1c-0397ce97cb25",
  spotTrade: "e3add588-be41-4ca8-8794-39c73b27c424",
  binaryWin: "ea84795d-a6ed-4c2d-843c-cc475a86d644",
  investment: "c9978f05-d5ff-47fe-8d9b-ba5a2adbedec",
  ecommerce: "c59bee11-8dd9-4974-87f7-14933b034a1f",
  p2p: "ce3b302a-b0c7-4e87-ae7b-60da5ccec2fd",
  nft: "1b6348d9-f054-4621-b317-04f1d29a0d2e",
  copyTrading: "1ba2b5e3-e1e2-419c-a36e-8fb7d921940e",
  staking: "c8098da3-c9ad-4689-969c-a1ce35053968",
  icoPurchase: "df4eeaae-91e4-48ed-89f4-918a6eda973e",
  futuresVolume: "cd7e7b4d-ca45-4040-9493-c98f6fce0008",
} as const;

/**
 * The USD rates written for the currencies this marketplace is denominated in,
 * when `exchange_currency` holds no usable price for them. Not market quotes —
 * plausible, obviously round figures so the page has a scale.
 *
 * BNB is here as well as ETH because the pre-existing CyberFeline collection
 * lists in BNB and its row is NULL too: with ETH priced and BNB not, the page
 * still carried "volume excludes unpriced currencies: BNB" under the KPI row.
 * Nothing in this seed sells in BNB — the fix is to the rate table, not to
 * anyone's listings.
 */
const RATE_FALLBACKS: Record<string, number> = { ETH: 3150, BNB: 615 };
/** Where the previous prices are parked so `--undo` can put them back. */
const RATE_BACKUP_SETTING = "docsCommerceRateBackup";

// Marketplace + collection economics, used to derive every NFT fee below.
const MARKETPLACE_FEE_PCT = 2.5;
const ROYALTY_PCT = 5;

// Sales tax applied to every e-commerce order below.
const TAX_RATE = 0.08;
// Taker fee on a replicated copy trade.
const TAKER_FEE = 0.001;

// ---------------------------------------------------------------------------
// Resolved at runtime
// ---------------------------------------------------------------------------

let CUSTOMER = "";
let OPERATOR = "";
let COUNTERPARTY = "";
/** Ava's pre-existing `nft_creator` row; one PENDING collection hangs off it. */
let CUSTOMER_CREATOR = "";

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

async function resolvePersonas() {
  const rows: any[] = await models.user.findAll({
    where: { email: [EMAIL_CUSTOMER, EMAIL_OPERATOR, EMAIL_COUNTERPARTY] },
    attributes: ["id", "email"],
  });
  const byEmail = new Map(rows.map((r) => [r.email, r.id]));
  CUSTOMER = byEmail.get(EMAIL_CUSTOMER) || "";
  OPERATOR = byEmail.get(EMAIL_OPERATOR) || "";
  COUNTERPARTY = byEmail.get(EMAIL_COUNTERPARTY) || "";

  const missing = [
    [EMAIL_CUSTOMER, CUSTOMER],
    [EMAIL_OPERATOR, OPERATOR],
    [EMAIL_COUNTERPARTY, COUNTERPARTY],
  ]
    .filter(([, id]) => !id)
    .map(([email]) => email);

  if (missing.length) {
    throw new Error(
      `Missing docs personas: ${missing.join(", ")}. Run scripts/seed-docs-demo.ts first.`
    );
  }

  // The owner's account must not be reachable from anything written here.
  const owner: any = await models.user.findOne({
    where: { email: FORBIDDEN_EMAIL },
    attributes: ["id"],
  });
  if (owner) {
    const referenced = new Set([CUSTOMER, OPERATOR, COUNTERPARTY, ...CROWD_IDS]);
    if (referenced.has(owner.id)) {
      throw new Error(
        `Refusing to run: ${FORBIDDEN_EMAIL} resolved into the persona set.`
      );
    }
  }

  const creator: any = await models.nftCreator.findOne({
    where: { userId: CUSTOMER },
    attributes: ["id"],
  });
  CUSTOMER_CREATOR = creator?.id || "";
}

// ---------------------------------------------------------------------------
// Purge
// ---------------------------------------------------------------------------

/**
 * Reverse dependency order. `force: true` everywhere — several of these models
 * are paranoid, and a soft-deleted row keeps its slot in a UNIQUE index
 * (`ecommerce_review(productId, userId)`, `mlm_referral_reward.sourceId`,
 * `nft_sale.transactionHash`, `nft_collection.slug`, `copy_trading_leaders.userId`),
 * so a soft purge makes the SECOND re-run fail rather than the first.
 */
const PURGE_ORDER: string[] = [
  "ecommerceReview",
  "ecommerceShippingAddress",
  "ecommerceOrderItem",
  "ecommerceOrder",
  "ecommerceShipping",
  "icoTransaction",
  "mlmReferralReward",
  "copyTradingTrade",
  "copyTradingFollower",
  "copyTradingLeader",
  "nftActivity",
  "nftDispute",
  "nftSale",
  "nftOffer",
  "nftListing",
  "nftToken",
  "nftCollection",
  "nftCreator",
];

/** Recount `participants` from the transactions that actually survive. */
async function recountOfferingParticipants() {
  for (const offeringId of [OFFERING_AUR, OFFERING_NWC]) {
    const [row]: any[] = await sequelize.query(
      `SELECT COUNT(DISTINCT userId) AS n FROM ico_transaction
        WHERE offeringId = :offeringId AND deletedAt IS NULL`,
      { replacements: { offeringId }, type: QueryTypes.SELECT }
    );
    await models.icoTokenOffering.update(
      { participants: Number(row?.n) || 0 },
      { where: { id: offeringId } }
    );
  }
}

async function purge() {
  for (const name of PURGE_ORDER) {
    const model: any = (models as any)[name];
    if (!model) continue;
    const removed = await model.destroy({
      where: { id: { [Op.like]: ID_LIKE } },
      force: true,
    });
    if (removed) log(`  - ${name}: removed ${removed}`);
  }

  await recountOfferingParticipants();

  // The currency rates, if and only if this script is the one that wrote them.
  const backup: any = await models.settings.findOne({
    where: { key: RATE_BACKUP_SETTING },
  });
  if (backup) {
    let previous: Record<string, string | null> = {};
    try {
      previous = JSON.parse(backup.value || "{}");
    } catch {
      // A corrupted backup must not strand a live rate: leave the prices alone
      // and drop the marker rather than guess at what was there.
      previous = {};
      log("  ! rate backup unreadable; leaving exchange_currency untouched");
    }
    for (const [currency, value] of Object.entries(previous)) {
      await models.exchangeCurrency.update(
        { price: (value === null ? null : value) as any },
        { where: { currency } }
      );
      log(`  - exchange_currency.${currency}.price restored to ${value ?? "NULL"}`);
    }
    await models.settings.destroy({ where: { key: RATE_BACKUP_SETTING } });
  }
}

// ===========================================================================
// 1. /admin/ecommerce/review
// ===========================================================================
/*
 * The table was empty for a reason no amount of staring at `ecommerce_review`
 * would show: it holds exactly ONE row, and that row's `deletedAt` is set. The
 * admin route goes through `getFiltered`, which is paranoid by default, so the
 * page was reading an empty result over a table that is not empty.
 *
 * `ecommerce_review` carries UNIQUE(productId, userId), so a reviewer appears
 * at most once per product. `status` is tinyint(1) — TRUE is PUBLISHED, FALSE
 * is HIDDEN — and the page's own analytics averages only the published ones, so
 * the two hidden rows below are the moderation state the screenshot exists to
 * demonstrate, not padding. The ratings are a J-curve on purpose: five stars
 * all the way down photographs as a fixture.
 */

interface ReviewSpec {
  n: number;
  product: keyof typeof PRODUCTS;
  user: string;
  rating: number;
  status: boolean;
  days: number;
  comment: string;
}

function reviewSpecs(): ReviewSpec[] {
  const c = CROWD_IDS;
  return [
    { n: 1, product: "wallet", user: c[0], rating: 5, status: true, days: 41, comment: "Setup took under ten minutes and the recovery flow is genuinely clear. Screen is small but readable." },
    { n: 2, product: "wallet", user: c[1], rating: 4, status: true, days: 34, comment: "Solid build. Docked one star because the USB-C cable in the box is very short." },
    { n: 3, product: "wallet", user: c[3], rating: 2, status: true, days: 22, comment: "Firmware update failed twice before it took. Support sorted it, but it was a rough first hour." },
    { n: 4, product: "wallet", user: CUSTOMER, rating: 5, status: true, days: 12, comment: "Second one I have bought. Pairing with the desktop app just works now." },
    { n: 5, product: "plate", user: c[2], rating: 5, status: true, days: 38, comment: "Stamped a 24-word seed with the punch set and it is dead legible. Feels indestructible." },
    { n: 6, product: "plate", user: c[4], rating: 4, status: true, days: 29, comment: "Does the job. The tile alignment guide could be a little deeper." },
    { n: 7, product: "plate", user: c[5], rating: 1, status: true, days: 17, comment: "Arrived bent in the envelope. Replacement was quick, but the packaging needs rethinking." },
    { n: 8, product: "plate", user: CUSTOMER, rating: 4, status: true, days: 9, comment: "Good weight, clean edges. Would like a version sized for a 12-word seed." },
    { n: 9, product: "course", user: c[6], rating: 5, status: true, days: 44, comment: "Module 7 on liquidity sweeps is worth the price on its own. Charts are annotated properly." },
    { n: 10, product: "course", user: c[7], rating: 3, status: true, days: 31, comment: "Content is strong but the first three modules repeat a lot of the free material." },
    { n: 11, product: "course", user: c[8], rating: 5, status: true, days: 19, comment: "Best structured trading course I have taken. The worked examples use real order books." },
    { n: 12, product: "course", user: CUSTOMER, rating: 5, status: true, days: 7, comment: "Watched it twice. The risk sizing module changed how I place stops." },
    { n: 13, product: "tracker", user: c[9], rating: 4, status: true, days: 26, comment: "Sync across three exchanges has been reliable. Tax export is CSV only for now." },
    { n: 14, product: "tracker", user: c[10], rating: 2, status: false, days: 15, comment: "Hidden pending moderation: names a competitor product and carries a referral link." },
    { n: 15, product: "tracker", user: c[11], rating: 5, status: true, days: 6, comment: "Portfolio view finally matches what my exchange says. Renewal was painless." },
    { n: 16, product: "tracker", user: COUNTERPARTY, rating: 3, status: false, days: 3, comment: "Hidden pending moderation: reviewer holds no completed order for this product." },
  ];
}

async function seedReviews() {
  const specs = reviewSpecs();
  for (const s of specs) {
    const at = ago(s.days);
    await models.ecommerceReview.create({
      id: cid(A_REVIEW, s.n),
      productId: PRODUCTS[s.product].id,
      userId: s.user,
      rating: s.rating,
      comment: s.comment,
      status: s.status,
      createdAt: at,
      updatedAt: at,
    } as any);
  }
  log(
    `  reviews: ${specs.length} rows (${specs.filter((s) => s.status).length} published, ` +
      `${specs.filter((s) => !s.status).length} hidden)`
  );
}

// ===========================================================================
// 2 + 3. /ecommerce/order and /ecommerce/shipping
// ===========================================================================
/*
 * Nine `ecommerce_order` rows already existed. Every one belonged to one of the
 * twelve shopper personas or to the owner's account, and the buyer route is
 * `where: { userId: user.id }` — so Ava, who is who the screenshot is taken as,
 * genuinely had none.
 *
 * Shipping is the same story one join further out: the buyer shipping route
 * requires `ecommerce_order.shippingId` to point at an `ecommerce_shipping` row
 * whose order belongs to the caller, and it also joins `shippingAddress`. Ava
 * had no orders, so she had no shipments and no addresses.
 *
 * `ecommerce_order.currency` is a SINGLE field, so an order may not mix a USD
 * product with a USDT one. The SPOT order below is on its own for exactly that
 * reason, and `priceOrder` throws rather than let a mixed one through.
 */

interface OrderSpec {
  n: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REJECTED";
  days: number;
  discount: number;
  shippingCost: number;
  lines: { product: keyof typeof PRODUCTS; qty: number }[];
  /** Shipment, where the order carries physical goods. */
  shipment?: {
    n: number;
    loadStatus: "PENDING" | "TRANSIT" | "DELIVERED" | "CANCELLED";
    transporter: string;
    vehicle: string;
    /** Negative = delivered that many days ago; positive = expected. */
    deliveryDays: number;
  };
}

const ORDER_SPECS: OrderSpec[] = [
  {
    n: 1, status: "COMPLETED", days: 46, discount: 0, shippingCost: 12.5,
    lines: [{ product: "wallet", qty: 1 }, { product: "plate", qty: 1 }],
    shipment: { n: 1, loadStatus: "DELIVERED", transporter: "Northbound Freight", vehicle: "Van NF-2214", deliveryDays: -41 },
  },
  {
    n: 2, status: "COMPLETED", days: 33, discount: 9, shippingCost: 8,
    lines: [{ product: "plate", qty: 2 }],
    shipment: { n: 2, loadStatus: "DELIVERED", transporter: "Harbour Courier", vehicle: "Van HC-0871", deliveryDays: -28 },
  },
  {
    n: 3, status: "COMPLETED", days: 27, discount: 0, shippingCost: 0,
    lines: [{ product: "course", qty: 1 }],
  },
  {
    n: 4, status: "COMPLETED", days: 21, discount: 0, shippingCost: 14,
    lines: [{ product: "plate", qty: 3 }],
    shipment: { n: 3, loadStatus: "DELIVERED", transporter: "Northbound Freight", vehicle: "Van NF-1109", deliveryDays: -16 },
  },
  {
    n: 5, status: "CANCELLED", days: 16, discount: 17.4, shippingCost: 12.5,
    lines: [{ product: "wallet", qty: 1 }, { product: "plate", qty: 1 }],
    shipment: { n: 4, loadStatus: "CANCELLED", transporter: "Harbour Courier", vehicle: "Van HC-0902", deliveryDays: 0 },
  },
  {
    n: 6, status: "COMPLETED", days: 11, discount: 0, shippingCost: 0,
    lines: [{ product: "tracker", qty: 1 }],
  },
  {
    n: 7, status: "REJECTED", days: 8, discount: 0, shippingCost: 0,
    lines: [{ product: "course", qty: 2 }],
  },
  {
    n: 8, status: "PENDING", days: 2, discount: 0, shippingCost: 12.5,
    lines: [{ product: "wallet", qty: 1 }],
    shipment: { n: 5, loadStatus: "TRANSIT", transporter: "Northbound Freight", vehicle: "Van NF-3050", deliveryDays: 3 },
  },
];

/** Everything derivable about an order, computed once, in one place. */
function priceOrder(spec: OrderSpec) {
  const lines = spec.lines.map((l) => {
    const p = PRODUCTS[l.product];
    return {
      ...l,
      unit: p.price,
      currency: p.currency,
      walletType: p.walletType,
      physical: p.physical,
      kg: p.kg,
      m3: p.m3,
      line: money(p.price * l.qty),
    };
  });

  const currencies = [...new Set(lines.map((l) => l.currency))];
  if (currencies.length !== 1) {
    throw new Error(
      `Order ${spec.n} mixes currencies (${currencies.join(", ")}); ecommerce_order has one currency field.`
    );
  }

  const subtotal = money(lines.reduce((s, l) => s + l.line, 0));
  const taxable = money(subtotal - spec.discount);
  const tax = money(taxable * TAX_RATE);
  const total = money(subtotal - spec.discount + spec.shippingCost + tax);

  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  const weight = round3(lines.reduce((s, l) => s + (l.physical ? l.kg * l.qty : 0), 0));
  const volume = round3(lines.reduce((s, l) => s + (l.physical ? l.m3 * l.qty : 0), 0));
  const units = lines.reduce((s, l) => s + l.qty, 0);

  return { lines, currency: currencies[0], walletType: lines[0].walletType, subtotal, tax, total, weight, volume, units };
}

async function seedOrdersAndShipping() {
  let itemN = 0;
  let addressN = 0;

  for (const spec of ORDER_SPECS) {
    const p = priceOrder(spec);
    const at = ago(spec.days);

    // The shipment first: the order carries the FK.
    let shippingId: string | null = null;
    if (spec.shipment) {
      const s = spec.shipment;
      if (p.weight <= 0) {
        throw new Error(`Order ${spec.n} has a shipment but no physical lines.`);
      }
      shippingId = cid(A_ORDER, 300 + s.n);
      await models.ecommerceShipping.create({
        id: shippingId,
        // `loadId` is what the buyer quotes to support, so a UUID here would
        // photograph as noise.
        loadId: `DOCS-LD-${String(2600 + s.n)}`,
        loadStatus: s.loadStatus,
        shipper: "Bicrypto Fulfilment",
        transporter: s.transporter,
        goodsType: "Consumer electronics",
        weight: p.weight,
        volume: p.volume,
        description: `${p.units} item${p.units === 1 ? "" : "s"} for order ${cid(A_ORDER, spec.n).slice(0, 8).toUpperCase()}`,
        vehicle: s.vehicle,
        // The shipment's cost IS the order's shipping line. The goods tax lives
        // on the order; charging it again here makes the two pages disagree.
        cost: spec.shippingCost,
        tax: 0,
        deliveryDate: s.deliveryDays >= 0 ? ahead(s.deliveryDays) : ago(-s.deliveryDays),
        createdAt: at,
        updatedAt: at,
      } as any);
    }

    await models.ecommerceOrder.create({
      id: cid(A_ORDER, spec.n),
      userId: CUSTOMER,
      status: spec.status,
      shippingId,
      // The legacy single-product column. The line items are the truth.
      productId: null,
      subtotal: p.subtotal,
      discount: spec.discount,
      shippingCost: spec.shippingCost,
      tax: p.tax,
      total: p.total,
      currency: p.currency,
      walletType: p.walletType,
      createdAt: at,
      updatedAt: at,
    } as any);

    for (const line of p.lines) {
      itemN += 1;
      await models.ecommerceOrderItem.create({
        id: cid(A_ORDER, 100 + itemN),
        orderId: cid(A_ORDER, spec.n),
        productId: PRODUCTS[line.product].id,
        quantity: line.qty,
        // A licence key only exists once the order has actually been paid for.
        key:
          !line.physical && spec.status === "COMPLETED"
            ? `DOCS-${line.product.toUpperCase().slice(0, 4)}-${String(4000 + itemN)}-XKQ${String(itemN).padStart(2, "0")}`
            : null,
        filePath: null,
        instructions: null,
      } as any);
    }

    if (spec.shipment) {
      addressN += 1;
      await models.ecommerceShippingAddress.create({
        id: cid(A_ORDER, 400 + addressN),
        userId: CUSTOMER,
        orderId: cid(A_ORDER, spec.n),
        name: "Ava Thornton",
        email: EMAIL_CUSTOMER,
        phone: "+15550142207",
        street: "18 Kingsway Court, Flat 3B",
        city: "Bristol",
        state: "Somerset",
        postalCode: "BS1 4QT",
        country: "United Kingdom",
        createdAt: at,
        updatedAt: at,
      } as any);
    }
  }

  const shipments = ORDER_SPECS.filter((s) => s.shipment).length;
  log(`  orders: ${ORDER_SPECS.length} orders / ${itemN} line items, ${shipments} shipments`);
}

// ===========================================================================
// 4 + 5. /admin/nft and /admin/nft/analytics
// ===========================================================================
/*
 * `/admin/nft` is a MODERATION console, not a scoreboard. Its five headline
 * queues are five row states somebody wrote deliberately, and all five read 0:
 *
 *   Collections to approve   nftCollection.status = 'PENDING'
 *   Open disputes            nftDispute.status IN (PENDING, INVESTIGATING,
 *                                                  AWAITING_RESPONSE, ESCALATED)
 *   Blocked settlements      nftListing.status = 'ACTIVE'
 *                              AND settlementBlockedAt IS NOT NULL
 *   Flagged escrow           nftOffer.status = 'ACCEPTED' AND flaggedAt IS NOT NULL
 *   Catalogue defects        already 10 — deliberately NOT moved; see the note
 *                            on tokens below
 *
 * and `nft_dispute` was an EMPTY TABLE, which is why the "Dispute flow" chart
 * had nothing to draw. That chart groups `createdAt` and `resolvedAt` into daily
 * UTC buckets over the last 7 days, so the disputes below are dated ACROSS that
 * window rather than dropped at "now": a chart of one column is not a chart.
 *
 * `/admin/nft/analytics` had non-zero KPI tiles and a dead Trading Volume
 * chart. Its guard is `volumeChart.some(point => point.sales > 0)`, and the
 * newest `nft_sale` row on this box was 34 days old against a 30-day window.
 *
 * The rows below form ONE coherent marketplace rather than four unrelated
 * piles: one ACTIVE collection of fourteen minted tokens, nine of which sold
 * (each sale carrying its own SOLD listing and its own SALE activity row),
 * three still listed, and two sitting in auctions whose settlement the cron
 * could not complete.
 */

const COLLECTION_ACTIVE = cid(A_NFT, 10);
const CREATOR_COUNTERPARTY = cid(A_NFT, 1);

const TOKEN_NAMES = [
  "Harbour Light 01 - Slack Water",
  "Harbour Light 02 - Spring Tide",
  "Harbour Light 03 - Neap",
  "Harbour Light 04 - Bar Crossing",
  "Harbour Light 05 - Sea Fret",
  "Harbour Light 06 - Ebb",
  "Harbour Light 07 - Flood",
  "Harbour Light 08 - Storm Cone",
  "Harbour Light 09 - Pilot Cutter",
  "Harbour Light 10 - Range Marker",
  "Harbour Light 11 - Fog Signal",
  "Harbour Light 12 - Leading Line",
  "Harbour Light 13 - Sector Light",
  "Harbour Light 14 - Occulting",
];

/** Nine sales, spread across the 30-day analytics window. */
const SALE_SPECS = [
  { n: 1, tokenIndex: 0, days: 28, price: 0.42 },
  { n: 2, tokenIndex: 1, days: 25, price: 0.88 },
  { n: 3, tokenIndex: 2, days: 21, price: 1.35 },
  { n: 4, tokenIndex: 3, days: 18, price: 0.65 },
  { n: 5, tokenIndex: 4, days: 15, price: 2.1 },
  { n: 6, tokenIndex: 5, days: 11, price: 0.97 },
  { n: 7, tokenIndex: 6, days: 8, price: 1.6 },
  { n: 8, tokenIndex: 7, days: 5, price: 0.55 },
  { n: 9, tokenIndex: 8, days: 2, price: 1.18 },
];

/** The two auctions whose settlement is stuck. */
const BLOCKED_AUCTIONS = [
  { n: 1, tokenIndex: 12, currentBid: 1.45, blockedDays: 4 },
  { n: 2, tokenIndex: 13, currentBid: 0.78, blockedDays: 2 },
];

/** The three that are simply for sale. */
const OPEN_LISTINGS = [
  { n: 1, tokenIndex: 9, price: 0.9 },
  { n: 2, tokenIndex: 10, price: 1.25 },
  { n: 3, tokenIndex: 11, price: 0.6 },
];

interface DisputeSpec {
  n: number;
  type: "FAKE_NFT" | "COPYRIGHT_INFRINGEMENT" | "SCAM" | "NOT_RECEIVED" | "WRONG_ITEM" | "UNAUTHORIZED_SALE" | "OTHER";
  status: "PENDING" | "INVESTIGATING" | "AWAITING_RESPONSE" | "RESOLVED" | "REJECTED" | "ESCALATED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  openedDays: number;
  resolvedDays?: number;
  assigned: boolean;
  title: string;
  description: string;
  resolutionType?: "REFUND" | "CANCEL_SALE" | "REMOVE_LISTING" | "BAN_USER" | "WARNING" | "NO_ACTION";
  resolution?: string;
  tokenIndex: number;
  reporterOffset: number;
}

const DISPUTE_SPECS: DisputeSpec[] = [
  { n: 1, type: "NOT_RECEIVED", status: "PENDING", priority: "MEDIUM", openedDays: 6, assigned: false, tokenIndex: 0, reporterOffset: 0, title: "Paid 0.42 ETH, token never arrived in wallet", description: "The sale shows COMPLETED on the marketplace but the token is still held at the seller's address six days later." },
  { n: 2, type: "COPYRIGHT_INFRINGEMENT", status: "INVESTIGATING", priority: "HIGH", openedDays: 6, assigned: true, tokenIndex: 1, reporterOffset: 1, title: "Artwork reused from an unrelated 2024 collection", description: "Reporter supplied two side-by-side captures and a link to the original mint on another chain." },
  { n: 3, type: "SCAM", status: "ESCALATED", priority: "CRITICAL", openedDays: 5, assigned: true, tokenIndex: 2, reporterOffset: 2, title: "Seller requested payment off-platform after the bid", description: "Escalated after the seller messaged three separate bidders asking them to settle by direct transfer." },
  { n: 4, type: "WRONG_ITEM", status: "RESOLVED", priority: "LOW", openedDays: 5, resolvedDays: 3, assigned: true, tokenIndex: 3, reporterOffset: 3, resolutionType: "NO_ACTION", resolution: "Buyer had two open bids and settled the other one. Chain history confirms the correct token was delivered.", title: "Received Harbour Light 04 instead of 03", description: "Buyer states the delivered token does not match the listing they bid on." },
  { n: 5, type: "FAKE_NFT", status: "PENDING", priority: "HIGH", openedDays: 4, assigned: false, tokenIndex: 4, reporterOffset: 4, title: "Duplicate of a token already sold in this collection", description: "Two tokens in the same collection resolve to an identical metadata hash." },
  { n: 6, type: "NOT_RECEIVED", status: "AWAITING_RESPONSE", priority: "MEDIUM", openedDays: 4, assigned: true, tokenIndex: 5, reporterOffset: 5, title: "Auction settled but escrow not released", description: "The winning bid was accepted; the escrow release transaction has not been broadcast. Seller asked for a wallet re-confirmation." },
  { n: 7, type: "UNAUTHORIZED_SALE", status: "INVESTIGATING", priority: "CRITICAL", openedDays: 3, assigned: true, tokenIndex: 6, reporterOffset: 6, title: "Token listed by an address the owner does not control", description: "Owner reports the listing was created while their approval was still pending. The marketplace approval log is being pulled." },
  { n: 8, type: "OTHER", status: "REJECTED", priority: "LOW", openedDays: 3, resolvedDays: 2, assigned: true, tokenIndex: 7, reporterOffset: 7, resolutionType: "NO_ACTION", resolution: "Reporter withdrew the claim; the delay was a wallet cache and the token was visible after a refresh.", title: "Token not visible in third-party wallet", description: "Reporter cannot see a purchased token in an external wallet app." },
  { n: 9, type: "SCAM", status: "PENDING", priority: "MEDIUM", openedDays: 2, assigned: false, tokenIndex: 8, reporterOffset: 8, title: "Bid retracted immediately after being accepted", description: "Bidder cancelled from the wallet side seconds after acceptance, leaving the listing in an inconsistent state." },
  { n: 10, type: "COPYRIGHT_INFRINGEMENT", status: "RESOLVED", priority: "HIGH", openedDays: 2, resolvedDays: 1, assigned: true, tokenIndex: 9, reporterOffset: 9, resolutionType: "REMOVE_LISTING", resolution: "Listing removed and the creator warned. The image was licensed for editorial use only.", title: "Stock photograph used without a commercial licence", description: "Rights holder supplied the licence terms showing editorial-only use." },
  { n: 11, type: "NOT_RECEIVED", status: "AWAITING_RESPONSE", priority: "LOW", openedDays: 1, assigned: false, tokenIndex: 10, reporterOffset: 10, title: "Transfer pending for over 24 hours", description: "Buyer is waiting on a transfer that has not confirmed. Awaiting the transaction hash from the buyer." },
  { n: 12, type: "FAKE_NFT", status: "ESCALATED", priority: "HIGH", openedDays: 1, assigned: true, tokenIndex: 11, reporterOffset: 11, title: "Collection impersonates a verified creator", description: "Collection name and banner closely copy a verified creator's profile. Escalated for a verification review." },
  { n: 13, type: "WRONG_ITEM", status: "RESOLVED", priority: "MEDIUM", openedDays: 1, resolvedDays: 0, assigned: true, tokenIndex: 12, reporterOffset: 0, resolutionType: "REFUND", resolution: "Refunded 0.55 ETH in full. The listing metadata had been edited after the bid was placed.", title: "Listing metadata changed after the bid was placed", description: "Attributes on the listing differ from the ones captured at bid time." },
  { n: 14, type: "OTHER", status: "PENDING", priority: "MEDIUM", openedDays: 0, assigned: false, tokenIndex: 13, reporterOffset: 1, title: "Royalty split does not match the collection terms", description: "Creator reports the royalty paid on a secondary sale is below the 5% the collection declares." },
];

/** Three ACCEPTED offers whose escrow could not be released. */
const FLAGGED_OFFERS = [
  { n: 1, tokenIndex: 0, amount: 0.4, flaggedDays: 5, buyerOffset: 3 },
  { n: 2, tokenIndex: 4, amount: 1.95, flaggedDays: 3, buyerOffset: 6 },
  { n: 3, tokenIndex: 8, amount: 1.1, flaggedDays: 1, buyerOffset: 9 },
];

const tokenRowId = (i: number) => cid(A_NFT, 20 + i);

async function seedNft() {
  // -- creator --------------------------------------------------------------
  await models.nftCreator.create({
    id: CREATOR_COUNTERPARTY,
    userId: COUNTERPARTY,
    displayName: "Osei Atelier",
    bio: "Demonstration creator account used for documentation screenshots.",
    isVerified: true,
    verificationTier: "SILVER",
    totalSales: SALE_SPECS.length,
    totalVolume: coin(SALE_SPECS.reduce((s, x) => s + x.price, 0)),
    totalItems: TOKEN_NAMES.length,
    floorPrice: Math.min(...OPEN_LISTINGS.map((l) => l.price)),
    profilePublic: true,
    createdAt: ago(120),
    updatedAt: ago(2),
  } as any);

  // -- collections ----------------------------------------------------------
  const collections: any[] = [
    {
      id: COLLECTION_ACTIVE,
      name: "Harbour Lights",
      slug: "harbour-lights-docs-demo",
      symbol: "HRBR",
      description: "Fourteen navigational marks along a working estuary. Demonstration collection for documentation screenshots.",
      status: "ACTIVE",
      creatorId: CREATOR_COUNTERPARTY,
      totalSupply: TOKEN_NAMES.length,
      maxSupply: TOKEN_NAMES.length,
      createdAt: ago(115),
    },
    {
      id: cid(A_NFT, 11),
      name: "Tideglass",
      slug: "tideglass-docs-demo",
      symbol: "TIDE",
      description: "Submitted for approval. Demonstration collection for documentation screenshots.",
      status: "PENDING",
      creatorId: CREATOR_COUNTERPARTY,
      totalSupply: 0,
      maxSupply: 500,
      createdAt: ago(9),
    },
    {
      id: cid(A_NFT, 12),
      name: "Kiln and Ember",
      slug: "kiln-and-ember-docs-demo",
      symbol: "KILN",
      description: "Submitted for approval. Demonstration collection for documentation screenshots.",
      status: "PENDING",
      creatorId: CREATOR_COUNTERPARTY,
      totalSupply: 0,
      maxSupply: 250,
      createdAt: ago(4),
    },
  ];

  // Ava already has an `nft_creator` row, so one pending collection is hers.
  // An approval queue that is one creator deep does not read as a queue.
  if (CUSTOMER_CREATOR) {
    collections.push({
      id: cid(A_NFT, 13),
      name: "Nine Fathoms",
      slug: "nine-fathoms-docs-demo",
      symbol: "FTHM",
      description: "Submitted for approval. Demonstration collection for documentation screenshots.",
      status: "PENDING",
      creatorId: CUSTOMER_CREATOR,
      totalSupply: 0,
      maxSupply: 100,
      createdAt: ago(2),
    });
  }

  for (const c of collections) {
    await models.nftCollection.create({
      ...c,
      chain: "ETH",
      network: "mainnet",
      standard: "ERC721",
      mintPrice: 0.05,
      currency: "ETH",
      royaltyPercentage: ROYALTY_PCT,
      royaltyAddress: "0xdc0e5A1b2C3d4E5F60718293a4B5c6D7e8F90a1b",
      contractAddress: c.status === "ACTIVE" ? "0xdc0e7B2c4D6e8F0a1B3c5D7e9F0a2B4c6D8e0F12" : null,
      isVerified: c.status === "ACTIVE",
      isLazyMinted: true,
      isPublicMintEnabled: c.status === "ACTIVE",
      updatedAt: c.createdAt,
    } as any);
  }

  // -- tokens ---------------------------------------------------------------
  /*
   * Every token below is MINTED and carries a metadataUri, an image AND a
   * blockchainTokenId. That is deliberate: `/admin/nft`'s "Catalogue defects"
   * queue counts exactly the tokens that lack one of those three, and a seed
   * that inflated a defect counter would be manufacturing work for an operator
   * in a screenshot whose whole subject is clearing work.
   */
  const listedIndices = new Set([
    ...OPEN_LISTINGS.map((l) => l.tokenIndex),
    ...BLOCKED_AUCTIONS.map((a) => a.tokenIndex),
  ]);

  for (let i = 0; i < TOKEN_NAMES.length; i++) {
    const sale = SALE_SPECS.find((s) => s.tokenIndex === i);
    const owner = sale ? CROWD_IDS[(sale.n + 2) % CROWD_IDS.length] : COUNTERPARTY;
    const mintedAt = ago(110 - i * 2);
    await models.nftToken.create({
      id: tokenRowId(i),
      collectionId: COLLECTION_ACTIVE,
      tokenId: String(i + 1),
      blockchainTokenId: String(i + 1),
      name: TOKEN_NAMES[i],
      description: "Demonstration token used for documentation screenshots.",
      image: `https://ipfs.example.com/ipfs/dc0eharbour/${i + 1}.png`,
      metadataUri: `https://ipfs.example.com/ipfs/dc0eharbour/${i + 1}.json`,
      metadataHash: `0xdc0e${String(i + 1).padStart(4, "0")}${"a4b5c6d7e8f9".repeat(6)}`.slice(0, 66),
      attributes: [
        { trait_type: "Mark", value: i % 2 === 0 ? "Leading" : "Sector" },
        { trait_type: "Tide", value: ["Ebb", "Flood", "Slack", "Spring"][i % 4] },
      ],
      ownerId: owner,
      // EXACTLY 40 hex digits after the `0x` — the model validates this with
      // an `is` regex, and a 38-digit "address" is rejected outright.
      ownerWalletAddress: `0xdc0e${String(i + 1).padStart(4, "0")}C4d6E8f0A1b3C5d7E9f0A2b4C6d8E0f1`,
      creatorId: CREATOR_COUNTERPARTY,
      mintedAt,
      isMinted: true,
      isListed: listedIndices.has(i),
      views: 40 + i * 17,
      likes: 3 + (i % 7),
      rarity: (["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] as const)[i % 5],
      rarityScore: 10 + i * 3.5,
      status: "MINTED",
      createdAt: mintedAt,
      updatedAt: mintedAt,
    } as any);

    /*
     * MINT activity, dated at the mint and therefore OUTSIDE the 30-day
     * analytics window on purpose. "Active Users" is a window figure taken from
     * `nft_activity`; back-dated mints must not inflate it, or the tile would
     * report a hundred participants in a month that saw nine.
     */
    await models.nftActivity.create({
      id: cid(A_NFT, 700 + i),
      type: "MINT",
      tokenId: tokenRowId(i),
      collectionId: COLLECTION_ACTIVE,
      fromUserId: null,
      toUserId: COUNTERPARTY,
      currency: "ETH",
      transactionHash: `0xdc0e${String(i + 1).padStart(2, "0")}17${"0".repeat(58)}`.slice(0, 66),
      createdAt: mintedAt,
      updatedAt: mintedAt,
    } as any);
  }

  // -- sales, each with the SOLD listing it settled through ------------------
  for (const s of SALE_SPECS) {
    const at = ago(s.days);
    const listingId = cid(A_NFT, 200 + s.n);
    const buyer = CROWD_IDS[(s.n + 2) % CROWD_IDS.length];
    const hash = `0xdc0e${String(s.n).padStart(2, "0")}5a${"0".repeat(58)}`.slice(0, 66);

    await models.nftListing.create({
      id: listingId,
      tokenId: tokenRowId(s.tokenIndex),
      sellerId: COUNTERPARTY,
      type: "FIXED_PRICE",
      price: s.price,
      currency: "ETH",
      status: "SOLD",
      views: 60 + s.n * 11,
      likes: 2 + s.n,
      startTime: ago(s.days + 7),
      soldAt: at,
      createdAt: ago(s.days + 7),
      updatedAt: at,
    } as any);

    // Fees are TAKEN, not typed: the marketplace's 2.5% and the collection's
    // declared 5% royalty. netAmount is what is left for the seller.
    const marketplaceFee = coin(s.price * (MARKETPLACE_FEE_PCT / 100));
    const royaltyFee = coin(s.price * (ROYALTY_PCT / 100));
    const totalFee = coin(marketplaceFee + royaltyFee);
    const netAmount = coin(s.price - totalFee);

    await models.nftSale.create({
      id: cid(A_NFT, 100 + s.n),
      tokenId: tokenRowId(s.tokenIndex),
      listingId,
      sellerId: COUNTERPARTY,
      buyerId: buyer,
      price: s.price,
      currency: "ETH",
      marketplaceFee,
      royaltyFee,
      totalFee,
      netAmount,
      transactionHash: hash,
      blockNumber: 21_400_000 + s.n * 137,
      status: "COMPLETED",
      createdAt: at,
      updatedAt: at,
    } as any);

    // The SALE activity is what makes "Active Users" a real figure — it is the
    // only table on the page that records who took part inside the window.
    await models.nftActivity.create({
      id: cid(A_NFT, 800 + s.n),
      type: "SALE",
      tokenId: tokenRowId(s.tokenIndex),
      collectionId: COLLECTION_ACTIVE,
      listingId,
      fromUserId: COUNTERPARTY,
      toUserId: buyer,
      price: s.price,
      currency: "ETH",
      transactionHash: hash,
      blockNumber: 21_400_000 + s.n * 137,
      createdAt: at,
      updatedAt: at,
    } as any);
  }

  // -- listings that are simply open ----------------------------------------
  for (const l of OPEN_LISTINGS) {
    const at = ago(20 - l.n * 3);
    await models.nftListing.create({
      id: cid(A_NFT, 300 + l.n),
      tokenId: tokenRowId(l.tokenIndex),
      sellerId: COUNTERPARTY,
      type: "FIXED_PRICE",
      price: l.price,
      currency: "ETH",
      status: "ACTIVE",
      views: 30 + l.n * 9,
      likes: 1 + l.n,
      startTime: at,
      createdAt: at,
      updatedAt: at,
    } as any);
  }

  // -- auctions the settlement cron could not complete ----------------------
  /*
   * `settlementBlockedAt` is stamped by `nft/utils/cron.ts` when an auction
   * ends with a winning bid and there is no on-chain auction contract holding
   * the money. A winner exists, funds are somewhere, and NOTHING moves until a
   * human acts — which is why the queue sits on the moderation console at all.
   * `auctionContractAddress` is left NULL because that absence IS the cause.
   */
  for (const a of BLOCKED_AUCTIONS) {
    const started = ago(a.blockedDays + 6);
    const ended = ago(a.blockedDays);
    await models.nftListing.create({
      id: cid(A_NFT, 400 + a.n),
      tokenId: tokenRowId(a.tokenIndex),
      sellerId: COUNTERPARTY,
      type: "AUCTION",
      price: null,
      currency: "ETH",
      startingBid: money(a.currentBid * 0.5),
      minBidIncrement: 0.05,
      reservePrice: money(a.currentBid * 0.75),
      currentBid: a.currentBid,
      status: "ACTIVE",
      views: 120 + a.n * 40,
      likes: 8 + a.n,
      startTime: started,
      endTime: ended,
      endedAt: ended,
      auctionContractAddress: null,
      settlementBlockedAt: ended,
      createdAt: started,
      updatedAt: ended,
    } as any);
  }

  // -- escrow flagged for manual release ------------------------------------
  for (const o of FLAGGED_OFFERS) {
    const at = ago(o.flaggedDays + 3);
    await models.nftOffer.create({
      id: cid(A_NFT, 500 + o.n),
      tokenId: tokenRowId(o.tokenIndex),
      collectionId: COLLECTION_ACTIVE,
      listingId: null,
      userId: CROWD_IDS[o.buyerOffset % CROWD_IDS.length],
      sellerId: COUNTERPARTY,
      type: "TOKEN",
      amount: o.amount,
      currency: "ETH",
      status: "ACCEPTED",
      message: "Escrow release failed; funds held pending manual review.",
      acceptedAt: ago(o.flaggedDays + 1),
      flaggedAt: ago(o.flaggedDays),
      expiresAt: ahead(10),
      createdAt: at,
      updatedAt: ago(o.flaggedDays),
    } as any);
  }

  // -- disputes -------------------------------------------------------------
  for (const d of DISPUTE_SPECS) {
    const opened = ago(d.openedDays, 3);
    const resolvedAt = d.resolvedDays === undefined ? null : ago(d.resolvedDays, 1);
    await models.nftDispute.create({
      id: cid(A_NFT, 600 + d.n),
      tokenId: tokenRowId(d.tokenIndex),
      listingId: null,
      transactionHash: null,
      disputeType: d.type,
      status: d.status,
      priority: d.priority,
      reporterId: CROWD_IDS[d.reporterOffset % CROWD_IDS.length],
      respondentId: COUNTERPARTY,
      assignedToId: d.assigned ? OPERATOR : null,
      title: d.title,
      description: d.description,
      // DataTypes.JSON — pass the object, never a JSON.stringify of it.
      evidence: [
        { kind: "screenshot", url: `https://cdn.example.com/docs-demo/dispute-${d.n}.png` },
      ],
      resolution: d.resolution ?? null,
      resolutionType: d.resolutionType ?? null,
      resolvedAt,
      resolvedById: resolvedAt ? OPERATOR : null,
      investigatedAt: d.status === "INVESTIGATING" || resolvedAt ? ago(d.openedDays, 1) : null,
      escalatedAt: d.status === "ESCALATED" ? ago(d.openedDays, 1) : null,
      createdAt: opened,
      updatedAt: resolvedAt ?? opened,
    } as any);
  }

  const open = DISPUTE_SPECS.filter((d) =>
    ["PENDING", "INVESTIGATING", "AWAITING_RESPONSE", "ESCALATED"].includes(d.status)
  ).length;
  log(
    `  nft: 1 active + ${collections.length - 1} pending collections, ${TOKEN_NAMES.length} tokens, ` +
      `${SALE_SPECS.length} sales, ${BLOCKED_AUCTIONS.length} blocked settlements, ` +
      `${FLAGGED_OFFERS.length} flagged escrow, ${DISPUTE_SPECS.length} disputes (${open} open)`
  );
}

/**
 * Give the marketplace's currencies a rate where they have none.
 * See THE MARKETPLACE RATES in the header.
 *
 * The backup is ONE settings row holding a JSON map of the previous values, so
 * `--undo` restores exactly what it found — including "it was NULL". A currency
 * that already has a usable price is never touched and never enters the backup,
 * which is what stops a second run from recording the value this script itself
 * wrote and then "restoring" it forever.
 */
async function ensureMarketplaceRates() {
  const previous: Record<string, string | null> = {};

  for (const [currency, fallback] of Object.entries(RATE_FALLBACKS)) {
    const row: any = await models.exchangeCurrency.findOne({ where: { currency } });
    if (!row) {
      log(`  ! exchange_currency has no ${currency} row; its volume will read $0.00`);
      continue;
    }
    const current = row.price === null || row.price === undefined ? null : Number(row.price);
    if (current !== null && Number.isFinite(current) && current > 0) {
      log(`  rate ${currency}: already ${current}, left alone`);
      continue;
    }
    previous[currency] = row.price === null || row.price === undefined ? null : String(row.price);
    await models.exchangeCurrency.update({ price: fallback }, { where: { currency } });
    log(`  rate ${currency}: was ${previous[currency] ?? "NULL"}, set to ${fallback} (restored by --undo)`);
  }

  if (Object.keys(previous).length) {
    await models.settings.create({
      key: RATE_BACKUP_SETTING,
      value: JSON.stringify(previous),
    } as any);
  }
}

// ===========================================================================
// 6. /ico/transaction
// ===========================================================================
/*
 * Fourteen `ico_transaction` rows existed, spread across the twelve shopper
 * personas and the owner. The route is `where: { userId: user.id }`, so Ava saw
 * none of them.
 *
 * The two offerings differ in what statuses are plausible, and the seed
 * respects that: AUR is ACTIVE, so it carries in-flight states (PENDING,
 * VERIFICATION) alongside settled ones; NWC is SUCCESS — a closed raise — so
 * everything filed under it is terminal.
 */

interface IcoSpec {
  n: number;
  offeringId: string;
  phase: keyof typeof PHASE;
  amount: number;
  status: "PENDING" | "VERIFICATION" | "RELEASED" | "REJECTED" | "REFUNDED";
  days: number;
  notes?: string;
}

const ICO_SPECS: IcoSpec[] = [
  { n: 1, offeringId: OFFERING_AUR, phase: "aurSeed", amount: 250_000, status: "RELEASED", days: 96 },
  { n: 2, offeringId: OFFERING_AUR, phase: "aurPrivate", amount: 400_000, status: "RELEASED", days: 74 },
  { n: 3, offeringId: OFFERING_AUR, phase: "aurPrivate", amount: 150_000, status: "RELEASED", days: 61 },
  { n: 4, offeringId: OFFERING_AUR, phase: "aurPublic", amount: 200_000, status: "VERIFICATION", days: 12, notes: "Wallet address submitted; awaiting the creator's on-chain confirmation." },
  { n: 5, offeringId: OFFERING_AUR, phase: "aurPublic", amount: 100_000, status: "PENDING", days: 4 },
  { n: 6, offeringId: OFFERING_AUR, phase: "aurPublic", amount: 75_000, status: "REJECTED", days: 27, notes: "Rejected: the destination wallet was on an unsupported network." },
  { n: 7, offeringId: OFFERING_NWC, phase: "nwcStrategic", amount: 80_000, status: "RELEASED", days: 143 },
  { n: 8, offeringId: OFFERING_NWC, phase: "nwcPublic", amount: 120_000, status: "RELEASED", days: 118 },
  { n: 9, offeringId: OFFERING_NWC, phase: "nwcPublic", amount: 40_000, status: "RELEASED", days: 109 },
  { n: 10, offeringId: OFFERING_NWC, phase: "nwcPublic", amount: 50_000, status: "REFUNDED", days: 101, notes: "Refunded in full at the contributor's request before the release window opened." },
];

const AVA_WALLET = "0xdc0eA1b2C3d4E5F60718293a4B5c6D7e8F90a1b2";

async function seedIco() {
  for (const s of ICO_SPECS) {
    const at = ago(s.days);
    const released = s.status === "RELEASED";
    await models.icoTransaction.create({
      id: cid(A_ICO, s.n),
      userId: CUSTOMER,
      offeringId: s.offeringId,
      phaseId: PHASE[s.phase].id,
      amount: s.amount,
      // The phase's own token price. Never a free number — the view dialog
      // multiplies amount x price and calls the product "Total paid".
      price: PHASE[s.phase].price,
      status: s.status,
      walletAddress: s.status === "PENDING" ? null : AVA_WALLET,
      releaseUrl: released
        ? `https://etherscan.example.com/tx/0xdc0e${String(s.n).padStart(2, "0")}re1ea5e${"0".repeat(48)}`.slice(0, 120)
        : "",
      notes: s.notes ?? null,
      createdAt: at,
      updatedAt: released ? ago(Math.max(0, s.days - 3)) : at,
    } as any);
  }

  // `participants` is a STORED counter that the purchase route increments per
  // new participant. Recounted rather than incremented, so a half-finished
  // previous run cannot leave it drifting.
  await recountOfferingParticipants();

  const released = money(
    ICO_SPECS.filter((s) => s.status === "RELEASED").reduce(
      (sum, s) => sum + s.amount * PHASE[s.phase].price,
      0
    )
  );
  log(`  ico: ${ICO_SPECS.length} transactions, $${released.toLocaleString()} released`);
}

// ===========================================================================
// 7. /affiliate/reward
// ===========================================================================
/*
 * `mlm_referral_reward` held 14 rows across three referrers, none of them Ava.
 *
 * The page's three cards come from the route's `summary`, which converts per
 * reward UNIT — `mlmReferralCondition.rewardCurrency` together with its
 * `rewardWalletType` — and declares anything it cannot price in
 * `unpricedCurrencies` rather than counting it as zero. Every condition this
 * install ships is FIAT/USD, so the rate is 1 and the three cards are the plain
 * sums asserted in `verify()`. The conditions are nevertheless picked from the
 * shipped set by id rather than invented, so the summary stays honest if an
 * operator later re-denominates one of them; `--verify` prints a note when any
 * of them is no longer USD.
 */

interface RewardSpec {
  n: number;
  condition: keyof typeof CONDITION;
  reward: number;
  claimed: boolean;
  days: number;
}

const REWARD_SPECS: RewardSpec[] = [
  { n: 1, condition: "welcome", reward: 25.0, claimed: true, days: 88 },
  { n: 2, condition: "firstDeposit", reward: 15.0, claimed: true, days: 84 },
  { n: 3, condition: "deposit", reward: 12.4, claimed: true, days: 71 },
  { n: 4, condition: "investment", reward: 40.0, claimed: true, days: 63 },
  { n: 5, condition: "staking", reward: 9.6, claimed: true, days: 52 },
  { n: 6, condition: "icoPurchase", reward: 30.0, claimed: true, days: 44 },
  { n: 7, condition: "binaryWin", reward: 1.0, claimed: true, days: 37 },
  { n: 8, condition: "spotTrade", reward: 6.2, claimed: true, days: 29 },
  { n: 9, condition: "tradeCommission", reward: 3.85, claimed: false, days: 21 },
  { n: 10, condition: "nft", reward: 22.5, claimed: false, days: 16 },
  { n: 11, condition: "copyTrading", reward: 18.0, claimed: false, days: 11 },
  { n: 12, condition: "futuresVolume", reward: 50.0, claimed: false, days: 6 },
  { n: 13, condition: "ecommerce", reward: 8.71, claimed: false, days: 3 },
  { n: 14, condition: "p2p", reward: 4.5, claimed: false, days: 1 },
];

async function seedRewards() {
  for (const s of REWARD_SPECS) {
    const at = ago(s.days);
    await models.mlmReferralReward.create({
      id: cid(A_AFFIL, s.n),
      conditionId: CONDITION[s.condition],
      referrerId: CUSTOMER,
      reward: s.reward,
      isClaimed: s.claimed,
      // `sourceId` carries a PLATFORM-WIDE UNIQUE index — it is what stops the
      // reward engine paying twice for one event. Deterministic here so a
      // re-run replaces rather than collides.
      sourceId: `docs-commerce:reward:${s.n}`,
      createdAt: at,
      updatedAt: s.claimed ? ago(Math.max(0, s.days - 2)) : at,
    } as any);
  }

  const total = money(REWARD_SPECS.reduce((s, r) => s + r.reward, 0));
  const unclaimedRows = REWARD_SPECS.filter((r) => !r.claimed);
  const available = money(unclaimedRows.reduce((s, r) => s + r.reward, 0));
  log(
    `  affiliate: ${REWARD_SPECS.length} rewards, $${total.toFixed(2)} lifetime, ` +
      `$${available.toFixed(2)} unclaimed across ${unclaimedRows.length}`
  );
}

// ===========================================================================
// 8. /copy-trading/trade
// ===========================================================================
/*
 * `copy_trading_trades` held 63 rows and the page still said "No trades found",
 * because the route resolves the caller's SUBSCRIPTIONS first:
 *
 *     const userFollowers = await models.copyTradingFollower.findAll({
 *       where: { userId: user.id }, ...
 *     });
 *     if (followerIds.length === 0) return { items: [], ... };
 *
 * Ava followed nobody, so it short-circuited before it ever looked at a trade.
 * The one existing subscription belongs to a different account, and the ONE
 * existing leader (`MashDiv`) belongs to johndoe3dmodeller@gmail.com — the
 * owner's real account, which must never appear in a screenshot. So Ava cannot
 * follow the leader that exists. Liam is stood up as a second leader (the
 * `userId` column is UNIQUE and Liam has no row) and Ava follows him.
 *
 * ARITHMETIC. The route's summary counts CLOSED trades only:
 *     totalTrades = count(CLOSED)
 *     totalProfit = sum(CLOSED.profit)
 *     winRate     = count(CLOSED.profit > 0) / totalTrades * 100
 * and the page's "Avg. Latency" card averages `latencyMs` over the rows on the
 * PAGE — so a trade with a null latency drags that card towards 0ms. Every
 * trade below therefore carries a latency, every closed one carries a profit,
 * and `profitPercent` is stored as profit / cost * 100 so the row can be
 * checked against itself.
 */

const LEADER_ID = cid(A_COPY, 1);
const FOLLOWER_ID = cid(A_COPY, 10);

interface TradeSpec {
  n: number;
  symbol: string;
  side: "BUY" | "SELL";
  status:
    | "CLOSED"
    | "OPEN"
    | "PENDING_REPLICATION"
    | "REPLICATED"
    | "CANCELLED"
    | "REPLICATION_FAILED"
    | "PARTIALLY_FILLED";
  amount: number;
  price: number;
  latencyMs: number;
  days: number;
  /** Realised PnL net of fee. CLOSED rows only. */
  profit?: number;
  errorMessage?: string;
}

const TRADE_SPECS: TradeSpec[] = [
  { n: 1, symbol: "BTC/USDT", side: "BUY", status: "CLOSED", amount: 0.015, price: 68_400, latencyMs: 74, days: 58, profit: 18.4 },
  { n: 2, symbol: "ETH/USDT", side: "BUY", status: "CLOSED", amount: 0.32, price: 3_180, latencyMs: 112, days: 54, profit: -6.25 },
  { n: 3, symbol: "BTC/USDT", side: "SELL", status: "CLOSED", amount: 0.021, price: 71_250, latencyMs: 58, days: 49, profit: 31.1 },
  { n: 4, symbol: "SOL/USDT", side: "BUY", status: "CLOSED", amount: 4.5, price: 148.2, latencyMs: 96, days: 43, profit: 12.75 },
  { n: 5, symbol: "ETH/USDT", side: "SELL", status: "CLOSED", amount: 0.44, price: 3_240, latencyMs: 187, days: 38, profit: -14.6 },
  { n: 6, symbol: "BTC/USDT", side: "BUY", status: "CLOSED", amount: 0.028, price: 69_800, latencyMs: 63, days: 31, profit: 47.3 },
  { n: 7, symbol: "SOL/USDT", side: "SELL", status: "CLOSED", amount: 3.2, price: 155.4, latencyMs: 141, days: 25, profit: 9.15 },
  { n: 8, symbol: "ETH/USDT", side: "BUY", status: "CLOSED", amount: 0.18, price: 3_305, latencyMs: 88, days: 19, profit: -3.8 },
  { n: 9, symbol: "BTC/USDT", side: "SELL", status: "CLOSED", amount: 0.017, price: 72_100, latencyMs: 51, days: 13, profit: 22.05 },
  { n: 10, symbol: "SOL/USDT", side: "BUY", status: "CLOSED", amount: 2.8, price: 151.7, latencyMs: 129, days: 9, profit: 5.9 },
  { n: 11, symbol: "BTC/USDT", side: "BUY", status: "OPEN", amount: 0.012, price: 70_950, latencyMs: 67, days: 6 },
  { n: 12, symbol: "ETH/USDT", side: "BUY", status: "OPEN", amount: 0.51, price: 3_268, latencyMs: 104, days: 4 },
  { n: 13, symbol: "SOL/USDT", side: "SELL", status: "OPEN", amount: 6.0, price: 149.85, latencyMs: 118, days: 2 },
  { n: 14, symbol: "BTC/USDT", side: "BUY", status: "PARTIALLY_FILLED", amount: 0.02, price: 71_400, latencyMs: 233, days: 2 },
  { n: 15, symbol: "ETH/USDT", side: "SELL", status: "REPLICATED", amount: 0.27, price: 3_291, latencyMs: 81, days: 1 },
  { n: 16, symbol: "SOL/USDT", side: "BUY", status: "PENDING_REPLICATION", amount: 1.9, price: 152.4, latencyMs: 46, days: 0 },
  { n: 17, symbol: "BTC/USDT", side: "SELL", status: "CANCELLED", amount: 0.009, price: 71_880, latencyMs: 312, days: 7, errorMessage: "Leader cancelled before the follower order reached the book." },
  { n: 18, symbol: "ETH/USDT", side: "BUY", status: "REPLICATION_FAILED", amount: 0.6, price: 3_255, latencyMs: 1_940, days: 15, errorMessage: "Insufficient USDT balance in the copy-trading wallet at replication time." },
];

async function seedCopyTrading() {
  await models.copyTradingLeader.create({
    id: LEADER_ID,
    userId: COUNTERPARTY,
    displayName: "Liam Osei",
    bio: "Demonstration leader account used for documentation screenshots. Swing entries on major pairs, no leverage.",
    tradingStyle: "SWING",
    riskLevel: "MEDIUM",
    profitSharePercent: 15,
    maxFollowers: 250,
    minFollowAmount: 100,
    tradingType: "SPOT",
    status: "ACTIVE",
    isPublic: true,
    createdAt: ago(180),
    updatedAt: ago(2),
  } as any);

  await models.copyTradingFollower.create({
    id: FOLLOWER_ID,
    userId: CUSTOMER,
    leaderId: LEADER_ID,
    copyMode: "PROPORTIONAL",
    fixedAmount: null,
    fixedRatio: 0.25,
    maxDailyLoss: 150,
    maxPositionSize: 500,
    stopLossPercent: 8,
    takeProfitPercent: 20,
    status: "ACTIVE",
    createdAt: ago(62),
    updatedAt: ago(2),
  } as any);

  for (const t of TRADE_SPECS) {
    const at = ago(t.days, t.n % 12);
    const cost = money(t.amount * t.price);
    const fee = money(cost * TAKER_FEE);
    const closed = t.status === "CLOSED";
    // A partially filled order really did fill part of itself; the three
    // states below never reached the book at all, so nothing executed.
    const unfilled = ["PENDING_REPLICATION", "CANCELLED", "REPLICATION_FAILED"].includes(t.status);
    const filledFraction = t.status === "PARTIALLY_FILLED" ? 0.45 : 1;

    await models.copyTradingTrade.create({
      id: cid(A_COPY, 100 + t.n),
      leaderId: LEADER_ID,
      followerId: FOLLOWER_ID,
      leaderOrderId: `DOCS-LEAD-${String(9000 + t.n)}`,
      followerOrderId: unfilled ? null : `DOCS-COPY-${String(9000 + t.n)}`,
      symbol: t.symbol,
      side: t.side,
      type: "MARKET",
      marketType: "SPOT",
      amount: t.amount,
      price: t.price,
      cost,
      fee,
      feeCurrency: "USDT",
      executedAmount: unfilled ? 0 : coin(t.amount * filledFraction),
      executedPrice: unfilled ? 0 : t.price,
      slippage: unfilled ? null : Math.round(((t.n % 5) + 1) * 0.0004 * 1e5) / 1e5,
      latencyMs: t.latencyMs,
      profit: closed ? t.profit : null,
      // DERIVED, so the row can be checked against itself.
      profitPercent:
        closed && t.profit !== undefined
          ? Math.round((t.profit / cost) * 10000) / 100
          : null,
      profitCurrency: closed ? "USDT" : null,
      status: t.status,
      errorMessage: t.errorMessage ?? null,
      isLeaderTrade: false,
      closedAt: closed ? ago(Math.max(0, t.days - 1)) : null,
      createdAt: at,
      updatedAt: closed ? ago(Math.max(0, t.days - 1)) : at,
    } as any);
  }

  const closed = TRADE_SPECS.filter((t) => t.status === "CLOSED");
  const profit = money(closed.reduce((s, t) => s + (t.profit || 0), 0));
  const wins = closed.filter((t) => (t.profit || 0) > 0).length;
  log(
    `  copy trading: 1 leader (Liam), 1 subscription, ${TRADE_SPECS.length} trades, ` +
      `${closed.length} closed, ${profit.toFixed(2)} USDT, ` +
      `${((wins / closed.length) * 100).toFixed(1)}% win rate`
  );
}

// ===========================================================================
// Verification — re-read everything and re-check the arithmetic
// ===========================================================================

async function verify(): Promise<boolean> {
  let ok = true;
  const fail = (msg: string) => {
    ok = false;
    log(`  FAIL  ${msg}`);
  };
  const pass = (msg: string) => log(`  ok    ${msg}`);

  // -- reviews --------------------------------------------------------------
  const specs = reviewSpecs();
  const reviews: any[] = await models.ecommerceReview.findAll({
    where: { id: { [Op.like]: ID_LIKE } },
  });
  if (reviews.length !== specs.length) {
    fail(`reviews: ${reviews.length} rows, expected ${specs.length}`);
  } else {
    const published = reviews.filter((r) => r.status);
    const avg = published.reduce((s, r) => s + Number(r.rating), 0) / (published.length || 1);
    const negative = published.filter((r) => Number(r.rating) <= 2).length;
    pass(
      `reviews: ${reviews.length} rows, ${published.length} published, avg ${avg.toFixed(2)}/5, ` +
        `${((negative / published.length) * 100).toFixed(1)}% negative`
    );
  }

  // -- orders: every total re-derived from its own lines --------------------
  let ordersOk = true;
  const orders: any[] = await models.ecommerceOrder.findAll({
    where: { id: { [Op.like]: ID_LIKE } },
    include: [
      {
        model: models.ecommerceProduct,
        as: "products",
        through: { attributes: ["quantity"] },
      },
    ],
  });
  if (orders.length !== ORDER_SPECS.length) {
    ordersOk = false;
    fail(`orders: ${orders.length} rows, expected ${ORDER_SPECS.length}`);
  }
  for (const order of orders) {
    const flag = (msg: string) => {
      ordersOk = false;
      fail(msg);
    };
    if (order.userId !== CUSTOMER) flag(`order ${order.id} is not Ava's`);
    const lines: any[] = order.products || [];
    if (!lines.length) {
      flag(`order ${order.id} has no line items`);
      continue;
    }
    const subtotal = money(
      lines.reduce(
        (s, p) => s + Number(p.price) * Number(p.ecommerceOrderItem?.quantity ?? 0),
        0
      )
    );
    const discount = Number(order.discount) || 0;
    const tax = money((subtotal - discount) * TAX_RATE);
    const total = money(subtotal - discount + (Number(order.shippingCost) || 0) + tax);
    if (money(Number(order.subtotal)) !== subtotal)
      flag(`order ${order.id}: subtotal ${order.subtotal} != sum of lines ${subtotal}`);
    if (money(Number(order.tax)) !== tax)
      flag(`order ${order.id}: tax ${order.tax} != 8% of ${money(subtotal - discount)} = ${tax}`);
    if (money(Number(order.total)) !== total)
      flag(`order ${order.id}: total ${order.total} != ${total}`);
    const currencies = new Set(lines.map((p) => p.currency));
    if (currencies.size !== 1 || !currencies.has(order.currency))
      flag(`order ${order.id}: currency ${order.currency} does not match its lines`);
  }
  if (ordersOk) {
    const revenue = money(
      orders
        .filter((o) => o.status === "COMPLETED" && o.currency === "USD")
        .reduce((s, o) => s + Number(o.total), 0)
    );
    pass(
      `orders: ${orders.length} rows, every subtotal/tax/total re-derived from its lines ` +
        `($${revenue.toFixed(2)} completed USD)`
    );
  } else {
    ok = false;
  }

  // -- shipping: joined exactly the way the buyer page joins it -------------
  let shipOk = true;
  const shipments: any[] = await models.ecommerceShipping.findAll({
    where: { id: { [Op.like]: ID_LIKE } },
    include: [
      {
        model: models.ecommerceOrder,
        as: "ecommerceOrders",
        where: { userId: CUSTOMER },
        required: true,
        include: [
          { model: models.ecommerceShippingAddress, as: "shippingAddress" },
          { model: models.ecommerceProduct, as: "products" },
        ],
      },
    ],
  });
  const expectedShipments = ORDER_SPECS.filter((s) => s.shipment).length;
  if (shipments.length !== expectedShipments) {
    shipOk = false;
    fail(`shipping: ${shipments.length} visible to Ava, expected ${expectedShipments}`);
  }
  for (const s of shipments) {
    const flag = (msg: string) => {
      shipOk = false;
      fail(msg);
    };
    const order = s.ecommerceOrders?.[0];
    if (!order) {
      flag(`shipment ${s.id} joins no order of Ava's`);
      continue;
    }
    if (!order.shippingAddress) flag(`shipment ${s.id}: its order has no shipping address`);
    if (money(Number(s.cost)) !== money(Number(order.shippingCost)))
      flag(`shipment ${s.id}: cost ${s.cost} != order shippingCost ${order.shippingCost}`);
    if (Number(s.weight) <= 0) flag(`shipment ${s.id}: weight is not positive`);
  }
  if (shipOk) {
    const statuses = [...new Set(shipments.map((s) => s.loadStatus))].sort().join("/");
    pass(
      `shipping: ${shipments.length} shipments (${statuses}), each with an address and a cost matching its order`
    );
  } else {
    ok = false;
  }

  // -- nft moderation queues, asked exactly as the console asks them ---------
  const pendingCollections = await models.nftCollection.count({ where: { status: "PENDING" } });
  const openDisputes = await models.nftDispute.count({
    where: { status: { [Op.in]: ["PENDING", "INVESTIGATING", "AWAITING_RESPONSE", "ESCALATED"] } },
  });
  const blocked = await models.nftListing.count({
    where: { status: "ACTIVE", settlementBlockedAt: { [Op.ne]: null as any } },
  });
  const flagged = await models.nftOffer.count({
    where: { status: "ACCEPTED", flaggedAt: { [Op.ne]: null as any } },
  });
  if (pendingCollections < 1) fail("nft: no collections awaiting approval");
  if (openDisputes < 1) fail("nft: no open disputes");
  if (blocked < 1) fail("nft: no blocked settlements");
  if (flagged < 1) fail("nft: no flagged escrow");
  if (pendingCollections && openDisputes && blocked && flagged)
    pass(
      `nft queues: ${pendingCollections} to approve, ${openDisputes} open disputes, ` +
        `${blocked} blocked settlements, ${flagged} flagged escrow`
    );

  // The dispute-flow chart needs opened AND resolved inside the 7-day window.
  const flowStart = new Date(Date.now() - 7 * DAY);
  const openedInWindow = await models.nftDispute.count({
    where: { createdAt: { [Op.gte]: flowStart } },
  });
  const resolvedInWindow = await models.nftDispute.count({
    where: { resolvedAt: { [Op.gte]: flowStart } },
  });
  if (openedInWindow < 2 || resolvedInWindow < 1)
    fail(
      `nft dispute flow: ${openedInWindow} opened / ${resolvedInWindow} resolved in 7 days — chart stays empty`
    );
  else pass(`nft dispute flow: ${openedInWindow} opened, ${resolvedInWindow} resolved inside 7 days`);

  // Catalogue defects must not have grown: every token written here is whole.
  const brokenMine = await models.nftToken.count({
    where: {
      id: { [Op.like]: ID_LIKE },
      [Op.or]: [
        { metadataUri: null as any },
        { metadataUri: "" },
        { image: null as any },
        { image: "" },
        { blockchainTokenId: null as any },
        { blockchainTokenId: "" },
      ],
    },
  });
  if (brokenMine > 0) fail(`nft: ${brokenMine} seeded tokens would count as catalogue defects`);
  else pass("nft catalogue: no seeded token adds to the defects queue");

  // -- nft analytics: sales inside the 30-day window, priced -----------------
  let salesOk = true;
  const windowStart = new Date(Date.now() - 30 * DAY);
  const sales: any[] = await models.nftSale.findAll({
    where: {
      id: { [Op.like]: ID_LIKE },
      status: "COMPLETED",
      createdAt: { [Op.gte]: windowStart },
    },
  });
  if (sales.length < 2) {
    salesOk = false;
    fail(`nft analytics: ${sales.length} sales inside 30 days — the volume chart stays empty`);
  }
  for (const s of sales) {
    const flag = (msg: string) => {
      salesOk = false;
      fail(msg);
    };
    const price = Number(s.price);
    const expectedMarketplace = coin(price * (MARKETPLACE_FEE_PCT / 100));
    const expectedRoyalty = coin(price * (ROYALTY_PCT / 100));
    const expectedNet = coin(price - expectedMarketplace - expectedRoyalty);
    if (Math.abs(Number(s.marketplaceFee) - expectedMarketplace) > 1e-8)
      flag(`sale ${s.id}: marketplaceFee ${s.marketplaceFee} != ${MARKETPLACE_FEE_PCT}% of ${price}`);
    if (Math.abs(Number(s.royaltyFee) - expectedRoyalty) > 1e-8)
      flag(`sale ${s.id}: royaltyFee ${s.royaltyFee} != ${ROYALTY_PCT}% of ${price}`);
    if (Math.abs(Number(s.totalFee) - (expectedMarketplace + expectedRoyalty)) > 1e-8)
      flag(`sale ${s.id}: totalFee ${s.totalFee} != marketplaceFee + royaltyFee`);
    if (Math.abs(Number(s.netAmount) - expectedNet) > 1e-8)
      flag(`sale ${s.id}: netAmount ${s.netAmount} != price - totalFee`);
  }
  /*
    Every currency the marketplace denominates in needs a rate, not just the one
    this seed sells in: an unpriced BNB floor price is enough to put "volume
    excludes unpriced currencies: BNB" under the KPI row of the photograph.
  */
  const rateRows: any[] = await models.exchangeCurrency.findAll({
    where: { currency: Object.keys(RATE_FALLBACKS) },
    attributes: ["currency", "price"],
  });
  const rates = new Map<string, number>(
    rateRows.map((r) => [r.currency, Number(r.price)])
  );
  const unpriced = Object.keys(RATE_FALLBACKS).filter(
    (c) => !(Number.isFinite(rates.get(c) as number) && (rates.get(c) as number) > 0)
  );
  if (unpriced.length) {
    salesOk = false;
    fail(
      `nft analytics: no USD rate for ${unpriced.join(", ")} — the page will carry ` +
        `"volume excludes unpriced currencies"`
    );
  }
  if (salesOk) {
    const eth = sales.reduce((s, x) => s + Number(x.price), 0);
    const ethRate = rates.get("ETH") as number;
    // `~` because exchange_currency.price is USDT-denominated and the route
    // scales it by the live USDT/USD rate before it reaches the tile.
    pass(
      `nft analytics: ${sales.length} sales in window, ${eth.toFixed(2)} ETH ~ ` +
        `$${money(eth * ethRate).toLocaleString()} at a stored ${ethRate}/ETH; ` +
        `rates present for ${Object.keys(RATE_FALLBACKS).join(", ")}; every fee re-derived`
    );
  } else {
    ok = false;
  }

  // -- ico ------------------------------------------------------------------
  let icoOk = true;
  const icoRows: any[] = await models.icoTransaction.findAll({
    where: { id: { [Op.like]: ID_LIKE } },
  });
  if (icoRows.length !== ICO_SPECS.length) {
    icoOk = false;
    fail(`ico: ${icoRows.length} rows, expected ${ICO_SPECS.length}`);
  }
  const phaseById = new Map(Object.values(PHASE).map((p) => [p.id, p.price]));
  for (const row of icoRows) {
    const flag = (msg: string) => {
      icoOk = false;
      fail(msg);
    };
    if (row.userId !== CUSTOMER) flag(`ico ${row.id} is not Ava's`);
    const phasePrice = phaseById.get(row.phaseId);
    if (phasePrice === undefined) flag(`ico ${row.id}: unknown phase ${row.phaseId}`);
    else if (Math.abs(Number(row.price) - phasePrice) > 1e-8)
      flag(`ico ${row.id}: price ${row.price} != its phase's token price ${phasePrice}`);
  }
  for (const offeringId of [OFFERING_AUR, OFFERING_NWC]) {
    const [distinct]: any[] = await sequelize.query(
      `SELECT COUNT(DISTINCT userId) AS n FROM ico_transaction
        WHERE offeringId = :offeringId AND deletedAt IS NULL`,
      { replacements: { offeringId }, type: QueryTypes.SELECT }
    );
    const offering: any = await models.icoTokenOffering.findByPk(offeringId);
    if (Number(offering?.participants) !== Number(distinct?.n)) {
      icoOk = false;
      fail(
        `ico offering ${offeringId}: participants ${offering?.participants} != ` +
          `${distinct?.n} distinct contributors`
      );
    }
  }
  if (icoOk)
    pass(
      `ico: ${icoRows.length} transactions, every price matches its phase, participants recounted`
    );
  else ok = false;

  // -- affiliate ------------------------------------------------------------
  const rewards: any[] = await models.mlmReferralReward.findAll({
    where: { id: { [Op.like]: ID_LIKE } },
  });
  if (rewards.length !== REWARD_SPECS.length)
    fail(`affiliate: ${rewards.length} rows, expected ${REWARD_SPECS.length}`);
  const conditionIds = new Set(Object.values(CONDITION));
  const conditions: any[] = await models.mlmReferralCondition.findAll({
    where: { id: [...conditionIds] },
    attributes: ["id", "rewardCurrency", "rewardWalletType"],
  });
  if (conditions.length !== conditionIds.size)
    fail(
      `affiliate: ${conditions.length}/${conditionIds.size} conditions exist — a missing one lands in unpricedCurrencies`
    );
  const nonUsd = conditions.filter((c) => c.rewardCurrency !== "USD");
  if (nonUsd.length)
    log(`  note  affiliate conditions no longer in USD: ${nonUsd.map((c) => c.rewardCurrency).join(", ")}`);
  const totalUSD = money(rewards.reduce((s, r) => s + Number(r.reward), 0));
  const unclaimedRows = rewards.filter((r) => !r.isClaimed);
  const availableUSD = money(unclaimedRows.reduce((s, r) => s + Number(r.reward), 0));
  const expectedTotal = money(REWARD_SPECS.reduce((s, r) => s + r.reward, 0));
  const expectedAvailable = money(
    REWARD_SPECS.filter((r) => !r.claimed).reduce((s, r) => s + r.reward, 0)
  );
  if (totalUSD !== expectedTotal)
    fail(`affiliate: stored lifetime ${totalUSD} != specified ${expectedTotal}`);
  else if (availableUSD !== expectedAvailable)
    fail(`affiliate: stored unclaimed ${availableUSD} != specified ${expectedAvailable}`);
  else
    pass(
      `affiliate: ${rewards.length} rewards, $${totalUSD.toFixed(2)} lifetime, ` +
        `$${availableUSD.toFixed(2)} across ${unclaimedRows.length} unclaimed`
    );

  // -- copy trading: recompute the route's summary from the stored rows ------
  const follower: any = await models.copyTradingFollower.findOne({
    where: { userId: CUSTOMER, id: { [Op.like]: ID_LIKE } },
  });
  if (!follower) {
    fail("copy trading: Ava has no subscription — the route short-circuits to empty");
  } else {
    let copyOk = true;
    const flag = (msg: string) => {
      copyOk = false;
      fail(msg);
    };
    const trades: any[] = await models.copyTradingTrade.findAll({
      where: { followerId: follower.id },
    });
    const closedRows = trades.filter((t) => t.status === "CLOSED");
    const totalProfit = money(closedRows.reduce((s, t) => s + (Number(t.profit) || 0), 0));
    const wins = closedRows.filter((t) => (Number(t.profit) || 0) > 0).length;
    const winRate = closedRows.length ? Math.round((wins / closedRows.length) * 10000) / 100 : 0;
    const expectedClosed = TRADE_SPECS.filter((t) => t.status === "CLOSED");
    const expectedProfit = money(expectedClosed.reduce((s, t) => s + (t.profit || 0), 0));
    if (trades.length !== TRADE_SPECS.length)
      flag(`copy trading: ${trades.length} trades, expected ${TRADE_SPECS.length}`);
    if (closedRows.length !== expectedClosed.length)
      flag(`copy trading: ${closedRows.length} closed, expected ${expectedClosed.length}`);
    if (totalProfit !== expectedProfit)
      flag(`copy trading: summed profit ${totalProfit} != ${expectedProfit}`);
    for (const t of closedRows) {
      const expectedPct = Math.round((Number(t.profit) / Number(t.cost)) * 10000) / 100;
      if (Math.abs(Number(t.profitPercent) - expectedPct) > 0.011)
        flag(`copy trade ${t.id}: profitPercent ${t.profitPercent} != profit/cost = ${expectedPct}`);
    }
    if (trades.some((t) => !(Number(t.latencyMs) > 0)))
      flag("copy trading: a trade has no latency — the Avg. Latency card would read 0ms");
    if (copyOk)
      pass(
        `copy trading: ${trades.length} trades, ${closedRows.length} closed, ` +
          `${totalProfit.toFixed(2)} USDT, ${winRate.toFixed(1)}% win rate, every profitPercent re-derived`
      );
    else ok = false;
  }

  // -- the owner's account is nowhere near any of this -----------------------
  const owner: any = await models.user.findOne({
    where: { email: FORBIDDEN_EMAIL },
    attributes: ["id"],
  });
  if (owner) {
    const [hits]: any[] = await sequelize.query(
      `SELECT
         (SELECT COUNT(*) FROM ecommerce_order        WHERE id LIKE :like AND userId = :owner) +
         (SELECT COUNT(*) FROM ecommerce_review       WHERE id LIKE :like AND userId = :owner) +
         (SELECT COUNT(*) FROM ico_transaction        WHERE id LIKE :like AND userId = :owner) +
         (SELECT COUNT(*) FROM mlm_referral_reward    WHERE id LIKE :like AND referrerId = :owner) +
         (SELECT COUNT(*) FROM copy_trading_leaders   WHERE id LIKE :like AND userId = :owner) +
         (SELECT COUNT(*) FROM copy_trading_followers WHERE id LIKE :like AND userId = :owner) +
         (SELECT COUNT(*) FROM nft_creator            WHERE id LIKE :like AND userId = :owner) +
         (SELECT COUNT(*) FROM nft_token              WHERE id LIKE :like AND (ownerId = :owner OR creatorId = :owner)) +
         (SELECT COUNT(*) FROM nft_dispute            WHERE id LIKE :like AND (reporterId = :owner OR respondentId = :owner))
         AS n`,
      { replacements: { like: ID_LIKE, owner: owner.id }, type: QueryTypes.SELECT }
    );
    if (Number(hits?.n) !== 0) fail(`the owner's account is referenced by ${hits.n} seeded rows`);
    else pass(`${FORBIDDEN_EMAIL} is referenced by nothing this script wrote`);
  }

  return ok;
}

// ---------------------------------------------------------------------------

async function main() {
  await sequelize.authenticate();
  await resolvePersonas();

  if (MODE_VERIFY) {
    log("Verifying seed-docs-commerce...");
    const ok = await verify();
    if (!ok) process.exitCode = 1;
    return;
  }

  if (MODE_UNDO) {
    log("Removing everything seed-docs-commerce wrote...");
    await purge();
    log("Done.");
    return;
  }

  log("Seeding the commerce documentation surfaces (purging any previous run first)...");
  await purge();
  await seedReviews();
  await seedOrdersAndShipping();
  await ensureMarketplaceRates();
  await seedNft();
  await seedIco();
  await seedRewards();
  await seedCopyTrading();

  log("\nVerifying...");
  const ok = await verify();
  if (!ok) {
    process.exitCode = 1;
    log("\nVERIFICATION FAILED — do not photograph these screens.");
    return;
  }

  log("\n---------------------------------------------------------------");
  log("  /admin/ecommerce/review   as ops.demo@example.com");
  log("  /ecommerce/order          as ava.thornton@example.com");
  log("  /ecommerce/shipping       as ava.thornton@example.com");
  log("  /admin/nft                as ops.demo@example.com");
  log("  /admin/nft/analytics      as ops.demo@example.com");
  log("  /ico/transaction          as ava.thornton@example.com");
  log("  /affiliate/reward         as ava.thornton@example.com");
  log("  /copy-trading/trade       as ava.thornton@example.com");
  log("---------------------------------------------------------------");
  log(
    "  undo:  npx tsx -r dotenv/config scripts/seed-docs-commerce.ts dotenv_config_path=../.env --undo"
  );
}

main()
  .then(async () => {
    await sequelize.close();
    process.exit(process.exitCode ?? 0);
  })
  .catch(async (err) => {
    console.error(err);
    try {
      await sequelize.close();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
