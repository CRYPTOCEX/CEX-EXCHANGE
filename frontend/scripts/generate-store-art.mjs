#!/usr/bin/env node
/**
 * Store art for products the MashDiv store does not list.
 * ============================================================================
 *
 * `public/img/store/*.svg` are copies of the store's own product thumbnails
 * (`store/scripts/generate-thumbnails.ts`), and for anything that IS a store
 * listing that remains the source of truth — do not regenerate those here.
 *
 * This script exists for the products that are bundled rather than sold, and
 * therefore have no listing to copy from. Measured on 2026-08-05, four rows on
 * `/admin/system/extension` rendered with no art at all:
 *
 *     exchange    binanceus, kraken, okx
 *     blockchain  MO
 *
 * They are not in `backend/seeders/20240402234748-exchanges.js` (which ships
 * only kucoin / binance / xt) and their `productId`s are per-install hex
 * placeholders, so nothing upstream was ever going to produce a thumbnail for
 * them.
 *
 * WHY A GENERATOR AND NOT EIGHT HAND-WRITTEN FILES
 * -----------------------------------------------
 * Each product needs a dark file and a `-light` sibling (see
 * `components/ui/themed-art.tsx`), and the two differ by a fixed five-rule
 * recolour. Hand-authoring eight 9.5KB SVGs is eight chances to drift from a
 * grammar that 30 existing files share — the exact failure mode the four
 * duplicated page frames on the extension detail route were. Here the layout
 * comes from an existing file, verbatim, and only the strings and the two
 * accents move.
 *
 * `--verify` proves the recolour rules by regenerating the light siblings of
 * files this script did NOT write and diffing them against what is on disk. If
 * that passes, the light files this script emits are correct by construction.
 *
 *     node scripts/generate-store-art.mjs --verify
 *     node scripts/generate-store-art.mjs
 *
 * PILL AND CHIP WIDTHS ARE COMPUTED, NOT MEASURED BY EYE.
 * ------------------------------------------------------
 * SVG has no layout engine, so every rounded label carries a hand-written
 * width — and the store's generator derives it as `0.62 * fontSize * chars +
 * 34`. That is not a guess: it reproduces all four existing labels exactly
 * ("Live market data" 16ch@16 -> 192.72, "Auto liquidity" 14ch@16 -> 172.88,
 * "EXCHANGE PROVIDER" 17ch@15 -> 192.1, "TRX deposits & withdrawals" 26ch@16
 * -> 291.92). Text is centred on the resulting box.
 *
 * Character counts use the RAW label, before XML escaping — `&` is one
 * character to the type setter and five to the parser, and the store's own
 * numbers confirm the raw count is the one that was used.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, '..', 'public', 'img', 'store');

const read = (name) => readFileSync(join(ART, `${name}.svg`), 'utf8');

// ============================================================================
// GEOMETRY
// ============================================================================

const PILL_PAD = 34;
const PER_CHAR = 0.62;

const pillWidth = (text, fontSize) =>
  Math.round((PER_CHAR * fontSize * text.length + PILL_PAD) * 100) / 100;

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FONT =
  "Inter, 'Segoe UI', -apple-system, system-ui, sans-serif";

/** One accent-tinted rounded label: the rect plus its centred text. */
function chip({ x, y, label, color, fontSize = 16 }) {
  const w = pillWidth(label, fontSize);
  const h = fontSize === 16 ? 33.6 : 31.5;
  const baseline = y + (fontSize === 16 ? 23.04 : 21.6);
  return {
    width: w,
    markup:
      `<g>\n` +
      `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ` +
      `fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-opacity="0.4"/>\n` +
      `  <text x="${x + w / 2}" y="${baseline}" text-anchor="middle" ` +
      `font-family="${FONT}" font-size="${fontSize}" font-weight="700" ` +
      `fill="${color}">${esc(label)}</text>\n` +
      `</g>`,
  };
}

/** The two chips as one block, laid left to right from `x`. */
function chipRow({ x, y, gap, labels, colors }) {
  const first = chip({ x, y, label: labels[0], color: colors[0] });
  const second = chip({
    x: x + first.width + gap,
    y,
    label: labels[1],
    color: colors[1],
  });
  const right = x + first.width + gap + second.width;
  if (right > 1136) {
    throw new Error(
      `chip row overflows the 64px right margin (${right} > 1136): ` +
        `"${labels[0]}" + "${labels[1]}"`
    );
  }
  return `${first.markup}\n${second.markup}`;
}

// ============================================================================
// DARK -> LIGHT
// ============================================================================
/**
 * The five rules, derived by diffing `kucoin-provider` and `tron` against their
 * shipped light siblings. Order matters: `#ffffff` becomes the light ink BEFORE
 * `#14141d` becomes the new surface white, or the surfaces would be recoloured
 * to ink on the second pass.
 */
function toLight(svg, { globeAccent = null } = {}) {
  let out = svg;

  // The globe wireframe drops its accent in light mode — it is a texture, and
  // at 0.32 alpha a saturated hue on a near-white ground reads as a smudge.
  // The name pill's stroke, which shares the same alpha, deliberately KEEPS it.
  if (globeAccent) {
    for (const [find, replace] of [
      [
        `<circle cx="870" cy="270" r="135" fill="none" stroke="${globeAccent}" stroke-opacity="0.45"`,
        `<circle cx="870" cy="270" r="135" fill="none" stroke="#64748b" stroke-opacity="0.45"`,
      ],
      [
        `<ellipse cx="870" cy="270" rx="135" ry="54" fill="none" stroke="${globeAccent}" stroke-opacity="0.32"`,
        `<ellipse cx="870" cy="270" rx="135" ry="54" fill="none" stroke="#64748b" stroke-opacity="0.32"`,
      ],
      [
        `<ellipse cx="870" cy="270" rx="54" ry="135" fill="none" stroke="${globeAccent}" stroke-opacity="0.32"`,
        `<ellipse cx="870" cy="270" rx="54" ry="135" fill="none" stroke="#64748b" stroke-opacity="0.32"`,
      ],
    ]) {
      out = out.split(find).join(replace);
    }
  }

  out = out.split('stop-color="#101018"').join('stop-color="#f6f8fb"');
  out = out.split('stop-color="#0a0a10"').join('stop-color="#eceff4"');
  // Grid hairlines and every ink in one rule — both are `#ffffff` in the dark
  // files. `#fff` (the lockup monogram, which sits on the accent tile) is a
  // DIFFERENT literal and is deliberately left alone.
  out = out.split('#ffffff').join('#0f172a');
  out = out.split('#14141d').join('#ffffff');

  return out;
}

// ============================================================================
// TEMPLATES
// ============================================================================

/** Replace once, and fail loudly if the anchor is not there. */
function sub(svg, find, replace, what) {
  if (!svg.includes(find)) {
    throw new Error(`template anchor missing (${what}): ${find.slice(0, 80)}`);
  }
  return svg.split(find).join(replace);
}

function buildExchange(spec) {
  const base = read('kucoin-provider');
  const [a1, a2] = spec.accents;
  let svg = base;

  svg = sub(svg, 'aria-label="KuCoin Provider"', `aria-label="${spec.label}"`, 'aria-label');
  // Accents first: everything below re-emits markup already carrying them.
  svg = svg.split('#34d399').join(a1);
  svg = svg.split('#14b8a6').join(a2);

  svg = sub(svg, '>KUCOIN</text>', `>${esc(spec.pill)}</text>`, 'name pill');
  svg = sub(svg, '>KuCoin</text>', `>${esc(spec.title[0])}</text>`, 'title line 1');
  svg = sub(svg, '>Provider</text>', `>${esc(spec.title[1])}</text>`, 'title line 2');
  svg = sub(
    svg,
    '>Automated liquidity via KuCoin —</text>',
    `>${esc(spec.subtitle[0])}</text>`,
    'subtitle line 1'
  );
  svg = sub(
    svg,
    '>orders, tickers, OHLCV.</text>',
    `>${esc(spec.subtitle[1])}</text>`,
    'subtitle line 2'
  );

  // The two chips are rebuilt rather than patched — their widths and centres
  // all move together with the label.
  const oldChips = base
    .slice(base.indexOf('<g>\n  <rect x="690" y="545"'), base.indexOf('</g></g>') + 4)
    .split('#34d399')
    .join(a1)
    .split('#14b8a6')
    .join(a2);
  svg = sub(
    svg,
    oldChips,
    chipRow({ x: 690, y: 545, gap: 8, labels: spec.chips, colors: [a1, a2] }),
    'chip row'
  );

  return { dark: svg, light: toLight(svg, { globeAccent: a1 }) };
}

function buildBlockchain(spec) {
  const base = read('tron');
  const [a1, a2] = spec.accents;
  let svg = base;

  svg = sub(svg, 'aria-label="Tron"', `aria-label="${spec.label}"`, 'aria-label');
  svg = svg.split('#fb7185').join(a1);
  svg = svg.split('#ec4899').join(a2);

  svg = sub(svg, '>T</text>', `>${esc(spec.glyph)}</text>`, 'glyph');
  svg = sub(svg, '>Tron</text>', `>${esc(spec.title)}</text>`, 'title');
  svg = sub(
    svg,
    ">TRX &amp; TRC20 — the region's</text>",
    `>${esc(spec.subtitle[0])}</text>`,
    'subtitle line 1'
  );
  svg = sub(
    svg,
    '>favorite payment rails.</text>',
    `>${esc(spec.subtitle[1])}</text>`,
    'subtitle line 2'
  );

  const badgeLabel = 'BLOCKCHAIN';
  const badgeW = pillWidth(badgeLabel, 15);
  if (Math.abs(badgeW - 127) > 0.01) {
    throw new Error(`badge width formula drifted: ${badgeW} != 127`);
  }

  const oldChips = base
    .slice(base.indexOf('<g>\n  <rect x="636" y="570"'), base.indexOf('</g></g>') + 4)
    .split('#fb7185')
    .join(a1)
    .split('#ec4899')
    .join(a2);
  svg = sub(
    svg,
    oldChips,
    chipRow({ x: 636, y: 570, gap: 42, labels: spec.chips, colors: [a1, a2] }),
    'chip row'
  );

  return { dark: svg, light: toLight(svg) };
}

// ============================================================================
// THE PRODUCTS
// ============================================================================
/**
 * Accents are chosen for SEPARATION inside a category, not for brand fidelity —
 * these render as thumbnails in a grid where the product name is already set at
 * 76px, so the hue's only job is to tell two rows apart at a glance. Taken:
 * emerald (kucoin), amber (binance), rose (xt) among exchanges; teal (solana),
 * rose (tron), cyan (ton), amber (monero) among chains.
 *
 * Binance US keeps the Binance family's gold because the two ARE the same
 * brand, and a reader scanning the grid should see that.
 */
const SPECS = [
  {
    file: 'binanceus-provider',
    kind: 'exchange',
    label: 'Binance US Provider',
    accents: ['#facc15', '#f97316'],
    pill: 'BINANCE US',
    title: ['Binance US', 'Provider'],
    subtitle: ['US-regulated Binance liquidity —', 'spot orders and market data.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'kraken-provider',
    kind: 'exchange',
    label: 'Kraken Provider',
    accents: ['#818cf8', '#6366f1'],
    pill: 'KRAKEN',
    title: ['Kraken', 'Provider'],
    subtitle: ['Deep, regulated liquidity —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'okx-provider',
    kind: 'exchange',
    label: 'OKX Provider',
    accents: ['#38bdf8', '#0ea5e9'],
    pill: 'OKX',
    title: ['OKX', 'Provider'],
    subtitle: ['Global OKX liquidity —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Deep order books'],
  },
  {
    file: 'bybit-provider',
    kind: 'exchange',
    label: 'Bybit Provider',
    accents: ['#f97316', '#fb923c'],
    pill: 'BYBIT',
    title: ['Bybit', 'Provider'],
    subtitle: ['Bybit spot liquidity —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'mexc-provider',
    kind: 'exchange',
    label: 'MEXC Provider',
    accents: ['#22d3ee', '#06b6d4'],
    pill: 'MEXC',
    title: ['MEXC', 'Provider'],
    subtitle: ['MEXC Global spot markets —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'gate-provider',
    kind: 'exchange',
    label: 'Gate.io Provider',
    accents: ['#4ade80', '#16a34a'],
    pill: 'GATE.IO',
    title: ['Gate.io', 'Provider'],
    subtitle: ['Gate.io spot liquidity —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'bitget-provider',
    kind: 'exchange',
    label: 'Bitget Provider',
    accents: ['#60a5fa', '#2563eb'],
    pill: 'BITGET',
    title: ['Bitget', 'Provider'],
    subtitle: ['Bitget spot liquidity —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'coinbase-provider',
    kind: 'exchange',
    label: 'Coinbase Provider',
    accents: ['#3b82f6', '#1d4ed8'],
    pill: 'COINBASE',
    title: ['Coinbase', 'Exchange'],
    subtitle: ['Coinbase Exchange spot —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'htx-provider',
    kind: 'exchange',
    label: 'HTX Provider',
    accents: ['#fb923c', '#ea580c'],
    pill: 'HTX',
    title: ['HTX', 'Provider'],
    subtitle: ['HTX (Huobi) spot markets —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'upbit-provider',
    kind: 'exchange',
    label: 'Upbit Provider',
    accents: ['#a78bfa', '#7c3aed'],
    pill: 'UPBIT',
    title: ['Upbit', 'Provider'],
    subtitle: ['Upbit spot liquidity —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'cryptocom-provider',
    kind: 'exchange',
    label: 'Crypto.com Provider',
    accents: ['#2563eb', '#0f172a'],
    pill: 'CRYPTO.COM',
    title: ['Crypto.com', 'Provider'],
    subtitle: ['Crypto.com Exchange spot —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'bitfinex-provider',
    kind: 'exchange',
    label: 'Bitfinex Provider',
    accents: ['#10b981', '#047857'],
    pill: 'BITFINEX',
    title: ['Bitfinex', 'Provider'],
    subtitle: ['Bitfinex spot liquidity —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'lbank-provider',
    kind: 'exchange',
    label: 'LBank Provider',
    accents: ['#e879f9', '#c026d3'],
    pill: 'LBANK',
    title: ['LBank', 'Provider'],
    subtitle: ['LBank spot liquidity —', 'orders, tickers, OHLCV.'],
    chips: ['Live market data', 'Spot orders'],
  },
  {
    file: 'mo-chain',
    kind: 'blockchain',
    label: 'MO Chain',
    accents: ['#c084fc', '#a855f7'],
    glyph: 'M',
    title: 'MO Chain',
    subtitle: ['The native ecosystem chain —', 'deposits, withdrawals, wallets.'],
    chips: ['MO deposits & withdrawals', 'Wallets'],
  },
];

// ============================================================================
// RUN
// ============================================================================

/**
 * Regenerate the light siblings of files this script did not write, and diff
 * them against what the store shipped. This is the whole warrant for emitting
 * light files at all.
 */
function verify() {
  const pairs = [
    ['kucoin-provider', '#34d399'],
    ['binance-provider', '#fcd34d'],
    ['xt-provider', '#fb7185'],
    ['tron', null],
    ['solana', null],
    ['ton', null],
    ['monero', null],
  ];
  let failures = 0;
  for (const [name, globeAccent] of pairs) {
    const lightPath = join(ART, `${name}-light.svg`);
    if (!existsSync(lightPath)) {
      console.log(`  SKIP  ${name} (no light sibling on disk)`);
      continue;
    }
    const expected = readFileSync(lightPath, 'utf8');
    const actual = toLight(read(name), { globeAccent });
    if (actual === expected) {
      console.log(`  ok    ${name}-light.svg`);
    } else {
      failures++;
      console.log(`  FAIL  ${name}-light.svg — recolour rules do not reproduce it`);
    }
  }
  if (failures) {
    console.error(`\n${failures} mismatch(es). Do NOT trust the emitted light files.`);
    process.exit(1);
  }
  console.log('\nRecolour rules reproduce every shipped light sibling.');
}

function generate() {
  for (const spec of SPECS) {
    const { dark, light } =
      spec.kind === 'exchange' ? buildExchange(spec) : buildBlockchain(spec);
    writeFileSync(join(ART, `${spec.file}.svg`), dark);
    writeFileSync(join(ART, `${spec.file}-light.svg`), light);
    console.log(`  wrote ${spec.file}.svg + ${spec.file}-light.svg`);
  }
}

if (process.argv.includes('--verify')) {
  verify();
} else {
  verify();
  console.log('');
  generate();
}
