/**
 * The fiction: who trades, where, in what, and with which words.
 *
 * Everything a human will read on the demo market comes from this file. It is
 * separated from the planner so the numbers and the copy can be judged
 * independently — a corridor list that reads as plausible is a different kind of
 * review from an escrow calculation that has to balance.
 */

/* --------------------------------------------------------------------------
   Corridors
   -------------------------------------------------------------------------- */

/**
 * Country -> fiat, kept EXACTLY in step with
 * `backend/src/api/(ext)/p2p/utils/country-currency.ts`.
 *
 * That file is what `market/locale.get.ts` uses to answer "what money does this
 * visitor think in". If a corridor here paired IQ with anything but IQD, a
 * visitor detected in Iraq would have the board default to a currency with no
 * offers behind it — which is the precise failure the locale detector exists to
 * prevent, reintroduced by the dataset instead of by the code.
 *
 * `perUsd` is a fallback only. The seeder prefers the platform's own
 * `currency.price` row when there is one, so the demo board quotes the same
 * rates the rest of the install believes in.
 */
export const CORRIDORS = [
  { country: "NG", fiat: "NGN", perUsd: 1600, name: "Nigeria" },
  { country: "IQ", fiat: "IQD", perUsd: 1310, name: "Iraq" },
  { country: "US", fiat: "USD", perUsd: 1, name: "United States" },
  { country: "GB", fiat: "GBP", perUsd: 0.79, name: "United Kingdom" },
  { country: "IN", fiat: "INR", perUsd: 88, name: "India" },
  { country: "BR", fiat: "BRL", perUsd: 5.4, name: "Brazil" },
  { country: "VN", fiat: "VND", perUsd: 25400, name: "Vietnam" },
  { country: "KE", fiat: "KES", perUsd: 129, name: "Kenya" },
  { country: "PH", fiat: "PHP", perUsd: 58, name: "Philippines" },
  { country: "TR", fiat: "TRY", perUsd: 41, name: "Turkey" },
  { country: "AE", fiat: "AED", perUsd: 3.67, name: "United Arab Emirates" },
  { country: "EG", fiat: "EGP", perUsd: 48, name: "Egypt" },
  { country: "ID", fiat: "IDR", perUsd: 16200, name: "Indonesia" },
  { country: "PK", fiat: "PKR", perUsd: 279, name: "Pakistan" },
  { country: "ZA", fiat: "ZAR", perUsd: 17.4, name: "South Africa" },
  { country: "RU", fiat: "RUB", perUsd: 92, name: "Russia" },
  { country: "CO", fiat: "COP", perUsd: 3900, name: "Colombia" },
  { country: "MX", fiat: "MXN", perUsd: 18.3, name: "Mexico" },
  { country: "DE", fiat: "EUR", perUsd: 0.92, name: "Germany" },
  { country: "AR", fiat: "ARS", perUsd: 1010, name: "Argentina" },
];

/**
 * The assets on the board.
 *
 * `walletType: "SPOT"` throughout, because that is the wallet the seeder funds
 * and the one `holdOfferEscrow` would use. Mixing in ECO would mean the demo
 * escrow depended on `walletData` chain ledgers that do not exist for invented
 * accounts.
 *
 * `weight` biases how often an asset is chosen, so USDT leads the board's asset
 * strip the way it does on a real desk rather than the three assets arriving in
 * equal thirds.
 */
export const ASSETS = [
  { currency: "USDT", usd: 1.0, weight: 6, decimals: 2, walletType: "SPOT" },
  { currency: "BTC", usd: 95400, weight: 2, decimals: 6, walletType: "SPOT" },
  { currency: "ETH", usd: 3180, weight: 1, decimals: 5, walletType: "SPOT" },
];

/* --------------------------------------------------------------------------
   Payment methods
   -------------------------------------------------------------------------- */

/**
 * Seeded as GLOBAL methods (userId NULL, isGlobal 1).
 *
 * A user-owned method can only be attached to an offer by its owner — offer
 * creation refuses anything else with "Invalid payment method IDs" — so a
 * method belonging to one demo trader could not appear on another's offer, and
 * the payment-method facet would be a list of fifteen private rails nobody
 * shares. "Bank Transfer" on a real install is a system method; so is this.
 *
 * `countries: ["*"]` means the rail is available everywhere; anything else
 * restricts it, so an Iraqi offer advertises Zain Cash and a Brazilian one
 * advertises Pix. A board where every row lists the same three methods is the
 * thing that makes a seeded marketplace read as seeded.
 */
export const PAYMENT_METHODS = [
  { key: "bank", name: "Bank Transfer", icon: "building-bank", countries: ["*"], time: "15-60 min", rank: 1 },
  { key: "cash", name: "Cash in Person", icon: "banknote", countries: ["*"], time: "On meeting", rank: 40 },
  { key: "wise", name: "Wise", icon: "credit-card", countries: ["*"], time: "Minutes", rank: 6 },
  { key: "paypal", name: "PayPal", icon: "credit-card", countries: ["US", "GB", "DE", "PH", "MX"], time: "Instant", rank: 8 },
  { key: "revolut", name: "Revolut", icon: "credit-card", countries: ["GB", "DE"], time: "Instant", rank: 10 },
  { key: "sepa", name: "SEPA Instant", icon: "building-bank", countries: ["DE"], time: "Under 10 sec", rank: 5 },
  { key: "zelle", name: "Zelle", icon: "credit-card", countries: ["US"], time: "Minutes", rank: 4 },
  { key: "cashapp", name: "Cash App", icon: "credit-card", countries: ["US"], time: "Instant", rank: 9 },
  { key: "pix", name: "Pix", icon: "credit-card", countries: ["BR"], time: "Instant", rank: 3 },
  { key: "mercadopago", name: "Mercado Pago", icon: "credit-card", countries: ["AR", "BR", "MX"], time: "Instant", rank: 12 },
  { key: "upi", name: "UPI", icon: "credit-card", countries: ["IN"], time: "Instant", rank: 2 },
  { key: "imps", name: "IMPS / NEFT", icon: "building-bank", countries: ["IN"], time: "10-30 min", rank: 14 },
  { key: "mpesa", name: "M-Pesa", icon: "credit-card", countries: ["KE"], time: "Instant", rank: 7 },
  { key: "zaincash", name: "Zain Cash", icon: "credit-card", countries: ["IQ"], time: "Instant", rank: 11 },
  { key: "fib", name: "FIB Transfer", icon: "building-bank", countries: ["IQ"], time: "15-45 min", rank: 15 },
  { key: "gcash", name: "GCash", icon: "credit-card", countries: ["PH"], time: "Instant", rank: 13 },
  { key: "papara", name: "Papara", icon: "credit-card", countries: ["TR"], time: "Instant", rank: 16 },
  { key: "vodafonecash", name: "Vodafone Cash", icon: "credit-card", countries: ["EG"], time: "Instant", rank: 17 },
  { key: "easypaisa", name: "Easypaisa", icon: "credit-card", countries: ["PK"], time: "Instant", rank: 18 },
  { key: "jazzcash", name: "JazzCash", icon: "credit-card", countries: ["PK"], time: "Instant", rank: 19 },
  { key: "capitec", name: "Capitec Pay", icon: "building-bank", countries: ["ZA"], time: "Minutes", rank: 20 },
  { key: "sbp", name: "SBP Fast Payments", icon: "building-bank", countries: ["RU"], time: "Instant", rank: 21 },
  { key: "nequi", name: "Nequi", icon: "credit-card", countries: ["CO"], time: "Instant", rank: 22 },
  { key: "spei", name: "SPEI", icon: "building-bank", countries: ["MX"], time: "Minutes", rank: 23 },
  { key: "momo", name: "MoMo Wallet", icon: "credit-card", countries: ["VN"], time: "Instant", rank: 24 },
  { key: "dana", name: "DANA", icon: "credit-card", countries: ["ID"], time: "Instant", rank: 25 },
  { key: "opay", name: "OPay", icon: "credit-card", countries: ["NG"], time: "Instant", rank: 26 },
  { key: "kuda", name: "Kuda Bank", icon: "building-bank", countries: ["NG"], time: "Minutes", rank: 27 },
  { key: "etisalat", name: "e& money", icon: "credit-card", countries: ["AE"], time: "Instant", rank: 28 },
];

export function methodsForCountry(country) {
  return PAYMENT_METHODS.filter(
    (m) => m.countries.includes("*") || m.countries.includes(country)
  );
}

/* --------------------------------------------------------------------------
   People
   -------------------------------------------------------------------------- */

/**
 * Names matched to their corridor, because a "Chinedu Okafor" running a
 * Vietnamese-dong board reads as generated the instant anyone looks twice.
 */
export const NAME_BANK = [
  ["NG", "Chinedu", "Okafor"], ["NG", "Amaka", "Balogun"], ["NG", "Tunde", "Adeyemi"],
  ["IQ", "Yusuf", "Al-Karim"], ["IQ", "Layla", "Hassan"], ["IQ", "Omar", "Al-Rashid"],
  ["US", "Marcus", "Bell"], ["US", "Dana", "Whitfield"], ["US", "Peter", "Nowak"],
  ["GB", "Oliver", "Hart"], ["GB", "Priya", "Shah"],
  ["IN", "Rohit", "Nair"], ["IN", "Ananya", "Iyer"], ["IN", "Vikram", "Desai"],
  ["BR", "Lucas", "Almeida"], ["BR", "Camila", "Rocha"],
  ["VN", "Minh", "Nguyen"], ["VN", "Hoa", "Tran"],
  ["KE", "Wanjiru", "Kamau"], ["KE", "Brian", "Otieno"],
  ["PH", "Joselito", "Reyes"], ["PH", "Maricel", "Santos"],
  ["TR", "Emre", "Yildiz"], ["TR", "Zeynep", "Kaya"],
  ["AE", "Faisal", "Al-Mansoori"],
  ["EG", "Mostafa", "Fahmy"], ["EG", "Nour", "Ibrahim"],
  ["ID", "Bagus", "Pratama"], ["ID", "Siti", "Rahayu"],
  ["PK", "Bilal", "Ahmed"], ["PK", "Sana", "Malik"],
  ["ZA", "Thabo", "Ndlovu"], ["ZA", "Elsa", "van Wyk"],
  ["RU", "Dmitri", "Volkov"], ["RU", "Irina", "Sokolova"],
  ["CO", "Andres", "Gomez"], ["CO", "Valentina", "Ruiz"],
  ["MX", "Diego", "Herrera"], ["MX", "Sofia", "Vargas"],
  ["DE", "Jonas", "Weber"], ["DE", "Lena", "Fischer"],
  ["AR", "Matias", "Ferreyra"], ["AR", "Julieta", "Sosa"],
];

/**
 * The five kinds of counterparty the market UI exists to tell apart.
 *
 * Every field here is a fact one of the trust surfaces computes:
 * `completed`/`rate` feed `completionRate` in `utils/trader-stats.ts`, and
 * `release` feeds `avgReleaseSeconds`, which is what decides whether
 * `market/picks.get.ts` writes "Releases in about 45 seconds" (a good tone) or
 * "Usually takes 14 minutes to release" (a caution). Without a slow-but-honest
 * archetype the caution branch of that function never renders, and an operator
 * cannot see that it works.
 */
export const ARCHETYPES = [
  {
    key: "veteran",
    label: "high-volume veteran",
    count: 3,
    completed: [210, 430],
    rate: [98, 100],
    release: [30, 90],
    offers: 6,
    verified: 1,
    reviewShare: 0.55,
  },
  {
    key: "regular",
    label: "ordinary trader",
    count: 6,
    completed: [22, 78],
    rate: [92, 98],
    release: [150, 420],
    offers: 4,
    // Not all of them: `trader.verified` reads `user.emailVerified`, and a board
    // where every badge is lit tells an operator nothing about the badge.
    verified: 0.7,
    reviewShare: 0.4,
  },
  {
    key: "slow",
    label: "slow but honest",
    count: 2,
    completed: [40, 90],
    rate: [100, 100],
    release: [660, 1180],
    offers: 3,
    verified: 1,
    reviewShare: 0.5,
  },
  {
    key: "fresh",
    label: "genuinely new",
    count: 3,
    completed: [0, 0],
    rate: [100, 100],
    release: null,
    offers: 2,
    verified: 0.34,
    reviewShare: 0,
  },
  {
    key: "shaky",
    label: "poor record",
    count: 1,
    completed: [18, 30],
    // Under 80, so the picks' caution styling and the "safest" ranking both have
    // something to push down.
    rate: [72, 78],
    release: [420, 900],
    offers: 2,
    verified: 0.5,
    reviewShare: 0.35,
  },
];

/* --------------------------------------------------------------------------
   Copy
   -------------------------------------------------------------------------- */

export const TERMS = [
  "Please send from an account in your own name. Third-party payments will be cancelled and reported.",
  "Reference must be left blank. Do not mention crypto, USDT or trading in the transfer note.",
  "I release within a minute of the payment landing. If I am offline the auto-release will handle it.",
  "Online 09:00-23:00 local time. Trades opened outside those hours are released the next morning.",
  "Send the exact amount shown. A short payment has to be refunded and both of us lose the fee.",
  "First trade with me is capped at the minimum. After that the full range is open to you.",
  "Screenshot of the transfer required in chat before I release. It takes ten seconds and saves disputes.",
];

export const REVIEW_COMMENTS = [
  "Fast release, no questions. Will trade again.",
  "Answered in chat within a minute and released as soon as the transfer landed.",
  "Smooth. Payment details were exactly as written on the offer.",
  "Took a little while to release but kept me updated the whole time.",
  "Second trade with them this month. Consistent.",
  "Clear instructions, no messing about with the reference.",
  "Released before my bank had even sent the confirmation SMS.",
  "Patient when my transfer was held by the bank for review.",
  "Good rate and no drama.",
  "Slower than the estimate but completely straight about it.",
  "Sent the wrong amount by mistake and they sorted it out without a dispute.",
  "Reliable. Been trading with them since March.",
  "No complaints. Everything as advertised.",
  "Would have liked a faster release, but the trade itself was fine.",
];

export const CANCEL_REASONS = [
  "Buyer did not send payment within the window.",
  "Changed my mind about the amount.",
  "Bank flagged the transfer, cancelling and will retry tomorrow.",
  "Opened by mistake, wrong offer.",
  "Counterparty asked to cancel in chat.",
];

export const DISPUTE_REASONS = [
  "Payment not received",
  "Amount received does not match the trade",
  "Seller has not released after payment was confirmed",
];

export const DISPUTE_DETAILS = [
  "I sent the full amount 40 minutes ago and uploaded the receipt in chat. The seller has stopped replying.",
  "The transfer that landed is short by roughly a fifth of the total and the reference does not match.",
  "Buyer marked the trade as paid but nothing has arrived in the account on the offer. Requesting a check.",
];

export const TRADE_MESSAGES = [
  "Hi, sending now from my main account.",
  "Payment sent, reference attached.",
  "Give me two minutes, the app is slow tonight.",
  "Received, releasing now.",
  "Thanks, pleasure trading.",
];

/* --------------------------------------------------------------------------
   Avatars
   -------------------------------------------------------------------------- */

const AVATAR_INKS = [
  "1f6f5b", "8a4b2a", "2c4a7c", "6b2f6b", "1f5f6f",
  "7a3550", "3d5a2c", "5a4a1f", "35406b", "6b3520",
];

/**
 * An inline SVG data URI rather than a file under `public/uploads`.
 *
 * Both surfaces that draw a trader use it safely: the P2P trust kit renders it
 * through Radix `AvatarImage`, which is a plain `<img>` with an initials
 * fallback, and `next/image` forces `unoptimized` for any `data:` src, so it
 * never reaches the optimizer's host allowlist. The decisive property is that
 * `--drop` leaves nothing behind — an avatar written to disk outlives the row
 * that pointed at it, and this repo has a whole class of bugs about exactly
 * that. `user.avatar` is varchar(1000); these are around 260 characters.
 */
export function avatarFor(first, last, index) {
  const initials = `${(first[0] || "?").toUpperCase()}${(last[0] || "?").toUpperCase()}`;
  const ink = AVATAR_INKS[index % AVATAR_INKS.length];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>` +
    `<rect width='96' height='96' rx='48' fill='%23${ink}'/>` +
    `<text x='48' y='60' font-family='system-ui,sans-serif' font-size='38' font-weight='600' ` +
    `fill='%23ffffff' text-anchor='middle'>${initials}</text></svg>`;
  return `data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23")}`;
}
