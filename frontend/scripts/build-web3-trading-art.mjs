#!/usr/bin/env node
/**
 * Store art for the Web3 Wallet & On-Chain Trading addon (internal extension
 * key `dex`), in both themes.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS GENERATED RATHER THAN POST-PROCESSED
 * ---------------------------------------------------------------------------
 * Same two reasons as `build-ai-support-art.mjs`, which this mirrors:
 *
 *   1. NOT EVERY WHITE IS INK. The "M" in the logo tile, the wallet glyph on
 *      the floating accent tile, the CTA label and the filled feature tile all
 *      sit ON a bright accent fill that does NOT change between themes. A
 *      blanket `#ffffff → #0f172a` turns them dark-on-blue and they vanish.
 *      They live in `ONDARK` and are never touched by `INK`.
 *
 *   2. ACCENT-COLOURED STROKES WASH OUT ON WHITE. The flip-button ring and the
 *      "you receive" panel border are hairlines in blue; legible on near-black,
 *      invisible on `#f6f8fb`. `wire()` swaps them to slate on the light pass.
 *
 * The accent pair is blue-600 → violet-600, deliberately BLUER than the AI
 * Support Agent's indigo → violet so the two tiles do not read as the same
 * product in the store grid.
 *
 *   node scripts/build-web3-trading-art.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, "..", "public", "img", "store");
/** The SVG basename, which is also the mashdiv.com listing slug for this one. */
const SLUG = "web3-wallet-trading";

const FONT = `Inter, 'Segoe UI', -apple-system, system-ui, sans-serif`;

/** Accent pair. Unchanged across themes — chromatic enough for both grounds. */
const ACC_A = "#2563eb";
const ACC_B = "#7c3aed";
const GREEN = "#34d399";
const AMBER = "#fbbf24";

/**
 * Text and glyphs that sit ON a bright accent fill.
 *
 * Constant white in BOTH themes. If these followed INK they would turn dark on
 * a blue tile and vanish in light mode — the single most common way a
 * mechanically-converted light variant breaks.
 */
const ONDARK = "#ffffff";

function palette(mode) {
  const light = mode === "light";
  return {
    light,
    INK: light ? "#0f172a" : "#ffffff",
    BG_A: light ? "#f6f8fb" : "#101018",
    BG_B: light ? "#eceff4" : "#0a0a10",
    SURFACE: light ? "#ffffff" : "#14141d",
    SHADOW: light ? "#334155" : "#000",
    SHADOW_OP: light ? 0.14 : 0.4,
    /** Structural strokes drawn in an accent: legible slate on a light ground. */
    wire: (accent) => (light ? "#64748b" : accent),
  };
}

function text(x, y, size, fill, body, opts = {}) {
  let a = `x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"`;
  if (opts.weight) a += ` font-weight="${opts.weight}"`;
  if (opts.ls) a += ` letter-spacing="${opts.ls}"`;
  if (opts.anchor) a += ` text-anchor="${opts.anchor}"`;
  a += ` fill="${fill}"`;
  if (opts.op) a += ` fill-opacity="${opts.op}"`;
  return `<text ${a}>${body}</text>`;
}

function grid(INK) {
  let out = "";
  for (let x = 40; x < 1200; x += 48)
    out += `<line x1="${x}" y1="0" x2="${x}" y2="720" stroke="${INK}" stroke-opacity="0.025"/>`;
  for (let y = 40; y < 720; y += 48)
    out += `<line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="${INK}" stroke-opacity="0.025"/>`;
  return out;
}

function render(mode) {
  const p = palette(mode);
  const { INK, BG_A, BG_B, SURFACE, SHADOW, SHADOW_OP } = p;
  // The window chrome hairline: white at 12% disappears on a light surface.
  const edge = p.light ? 0.1 : 0.12;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" width="1200" height="720" role="img" aria-label="Web3 Wallet &amp; On-Chain Trading">
<style>
@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes pu{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes bl{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes ty{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-4px);opacity:1}}
@keyframes be{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes sp{0%,100%{transform:rotate(0)}50%{transform:rotate(180deg)}}
@keyframes ma{to{stroke-dashoffset:-24}}
.af{animation:fl 9s ease-in-out infinite}
.ap{animation:pu 6s ease-in-out infinite}
.ab{animation:bl 4s ease-in-out infinite}
.abe{transform-box:fill-box;transform-origin:center;animation:be 6s ease-in-out infinite}
.as{transform-box:fill-box;transform-origin:center;animation:sp 7s ease-in-out infinite}
.am{stroke-dasharray:6 6;animation:ma 1.6s linear infinite}
.d1{transform-box:fill-box;animation:ty 1.3s ease-in-out infinite}
.d2{transform-box:fill-box;animation:ty 1.3s ease-in-out .18s infinite}
.d3{transform-box:fill-box;animation:ty 1.3s ease-in-out .36s infinite}
@media (prefers-reduced-motion:reduce){.af,.ap,.ab,.abe,.as,.am,.d1,.d2,.d3{animation:none}}
</style>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${BG_A}"/>
    <stop offset="1" stop-color="${BG_B}"/>
  </linearGradient>
  <linearGradient id="acc" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${ACC_A}"/>
    <stop offset="1" stop-color="${ACC_B}"/>
  </linearGradient>
  <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${ACC_A}" stop-opacity="${p.light ? 0.22 : 0.35}"/>
    <stop offset="1" stop-color="${ACC_A}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${ACC_B}" stop-opacity="${p.light ? 0.18 : 0.28}"/>
    <stop offset="1" stop-color="${ACC_B}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1200" height="720" fill="url(#bg)"/>
${grid(INK)}
<ellipse class="ap" cx="200" cy="40" rx="560" ry="330" fill="url(#glowA)"/>
<ellipse class="ap" cx="1080" cy="700" rx="520" ry="320" fill="url(#glowB)" style="animation-delay:1.6s"/>
<g opacity="0.97">
<g>
  <rect x="596" y="105" width="560" height="460" rx="18" fill="${SHADOW}" opacity="${SHADOW_OP}"/>
  <rect x="590" y="95" width="560" height="460" rx="18" fill="${SURFACE}" fill-opacity="0.94" stroke="${INK}" stroke-opacity="${edge}"/>
  <rect x="590" y="95" width="560" height="46" rx="18" fill="${INK}" fill-opacity="0.03"/>
  <line x1="590" y1="141" x2="1150" y2="141" stroke="${INK}" stroke-opacity="0.08"/>
  <circle cx="614" cy="118" r="5.5" fill="#fb7185" opacity="0.9"/>
  <circle cx="633" cy="118" r="5.5" fill="${AMBER}" opacity="0.9"/>
  <circle cx="652" cy="118" r="5.5" fill="${GREEN}" opacity="0.9"/>
  ${text(670, 125, 16, INK, "Swap", { weight: 600, op: 0.55 })}
  <rect x="944" y="105" width="138" height="28" rx="14" fill="${INK}" fill-opacity="0.05" stroke="${INK}" stroke-opacity="0.08"/>
  <circle class="ab" cx="962" cy="119" r="4.5" fill="${GREEN}"/>
  ${text(974, 124, 13, INK, "0x7a3f…9c21", { op: 0.55 })}
</g>

<g>
  <rect x="622" y="171" width="476" height="112" rx="16" fill="${INK}" fill-opacity="0.05" stroke="${INK}" stroke-opacity="0.08"/>
  ${text(642, 200, 15, INK, "You pay", { op: 0.5 })}
  ${text(642, 252, 38, INK, "1.25", { weight: 800, op: 0.92 })}
  ${text(642, 272, 13, INK, "Balance 3.61 ETH", { op: 0.42 })}
  <rect x="934" y="204" width="148" height="46" rx="23" fill="${INK}" fill-opacity="0.06" stroke="${INK}" stroke-opacity="0.1"/>
  <circle cx="960" cy="227" r="14" fill="url(#acc)"/>
  <path d="M960 219 l6 8 -6 5 -6 -5 z" fill="${ONDARK}" fill-opacity="0.9"/>
  ${text(984, 234, 17, INK, "ETH", { weight: 700, op: 0.9 })}
  <path d="M1052 223 l6 6 6 -6" fill="none" stroke="${INK}" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>

<g>
  <rect x="622" y="303" width="476" height="112" rx="16" fill="${ACC_A}" fill-opacity="${p.light ? 0.1 : 0.16}" stroke="${p.wire(ACC_A)}" stroke-opacity="0.45"/>
  ${text(642, 332, 15, INK, "You receive", { op: 0.5 })}
  ${text(642, 384, 38, INK, "4,182.60", { weight: 800, op: 0.92 })}
  ${text(642, 404, 13, INK, "≈ $4,182.60", { op: 0.42 })}
  <rect x="934" y="336" width="148" height="46" rx="23" fill="${INK}" fill-opacity="0.06" stroke="${INK}" stroke-opacity="0.1"/>
  <circle cx="960" cy="359" r="14" fill="${GREEN}"/>
  ${/* Dark green, not INK and not ONDARK: the coin is theme-invariant GREEN, on
       which white sits at 1.8:1 and dark slate looks like a hole. */ ""}
  ${text(960, 365, 17, "#065f46", "$", { weight: 800, anchor: "middle" })}
  ${text(984, 366, 17, INK, "USDC", { weight: 700, op: 0.9 })}
  <path d="M1052 355 l6 6 6 -6" fill="none" stroke="${INK}" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>

<g class="as">
  <circle cx="860" cy="293" r="22" fill="${SURFACE}" stroke="${p.wire(ACC_A)}" stroke-opacity="0.55" stroke-width="2"/>
  <path d="M853 284 v13 M849 293 l4 4 4 -4" fill="none" stroke="${p.wire(ACC_A)}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M867 302 v-13 M863 293 l4 -4 4 4" fill="none" stroke="${p.wire(ACC_B)}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</g>

<g>
  <rect x="622" y="431" width="476" height="38" rx="12" fill="${INK}" fill-opacity="0.04" stroke="${INK}" stroke-opacity="0.07"/>
  <circle class="d1" cx="642" cy="450" r="4" fill="${ACC_A}"/>
  <circle class="d2" cx="658" cy="450" r="4" fill="#5b4fdd"/>
  <circle class="d3" cx="674" cy="450" r="4" fill="${ACC_B}"/>
  <line class="am" x1="690" y1="450" x2="716" y2="450" stroke="${p.wire(ACC_B)}" stroke-opacity="0.6" stroke-width="2" stroke-linecap="round"/>
  ${text(728, 455, 14, INK, "3 aggregators quoted · best wins", { op: 0.58 })}
</g>

<g>
  <rect x="622" y="475" width="476" height="56" rx="16" fill="url(#acc)" fill-opacity="0.95"/>
  ${text(860, 510, 20, ONDARK, "Confirm in your wallet", { weight: 800, anchor: "middle" })}
</g>
${text(860, 549, 13, INK, "Non-custodial · you sign every transaction", { anchor: "middle", op: 0.5 })}

<g class="af">
  <rect x="1104" y="150" width="84" height="84" rx="22" fill="url(#acc)" class="abe"/>
  <rect x="1120" y="176" width="52" height="34" rx="9" fill="none" stroke="${ONDARK}" stroke-width="2.8" stroke-opacity="0.95"/>
  <rect x="1150" y="185" width="28" height="16" rx="8" fill="${ONDARK}" fill-opacity="0.95"/>
  <circle cx="1163" cy="193" r="3.4" fill="${ACC_B}"/>
</g>

<g>
  <rect x="622" y="575" width="146" height="60" rx="14" fill="${SURFACE}" stroke="${p.wire(ACC_A)}" stroke-opacity="0.4" stroke-width="2"/>
  ${text(695, 601, 15, INK, "Non-custodial", { weight: 700, anchor: "middle", op: 0.9 })}
  ${text(695, 622, 12.5, INK, "You hold the keys", { anchor: "middle", op: 0.5 })}
</g>
<g>
  <rect x="787" y="575" width="146" height="60" rx="14" fill="url(#acc)" fill-opacity="0.9"/>
  ${text(860, 601, 15, ONDARK, "6 EVM chains", { weight: 700, anchor: "middle" })}
  ${text(860, 622, 12.5, ONDARK, "One integration", { anchor: "middle", op: 0.8 })}
</g>
<g>
  <rect x="952" y="575" width="146" height="60" rx="14" fill="${SURFACE}" stroke="${p.wire(AMBER)}" stroke-opacity="0.4" stroke-width="2"/>
  ${text(1025, 601, 15, INK, "Best price", { weight: 700, anchor: "middle", op: 0.9 })}
  ${text(1025, 622, 12.5, INK, "Aggregated routes", { anchor: "middle", op: 0.5 })}
</g>
</g>
<g>
  <rect x="64" y="52" width="46" height="46" rx="13" fill="url(#acc)"/>
  ${text(87, 84, 26, ONDARK, "M", { weight: 900, anchor: "middle" })}
  ${text(124, 82, 18, INK, "MASHDIV", { weight: 800, ls: "3.5", op: 0.9 })}
</g>
<g>
  <rect x="64" y="206" width="80.5" height="31.5" rx="15.75" fill="${ACC_B}" fill-opacity="0.15" stroke="${ACC_B}" stroke-opacity="0.4"/>
  ${text(104.25, 227.6, 15, ACC_B, "ADDON", { weight: 700, anchor: "middle" })}
</g>
${/* Two sizes, not two equal lines: "& On-Chain Trading" at 64 would run to
     x≈730 and collide with the terminal card at x=590. The step down is the
     lockup, not a compromise. */ ""}
${text(64, 300, 64, INK, "Web3 Wallet", { weight: 800, ls: "-2" })}
${text(64, 358, 44, INK, "&amp; On-Chain Trading", { weight: 800, ls: "-1.5" })}
${text(64, 416, 27, INK, "Users bring their own wallet.", { op: 0.72 })}
${text(64, 454, 27, INK, "You route the trade, and take a fee.", { op: 0.72 })}
<g>
  <circle class="ab" cx="72" cy="642" r="5" fill="${GREEN}"/>
  ${text(88, 649, 19, INK, "Instant delivery · Lifetime updates", { op: 0.55 })}
</g>
</svg>
`;
}

for (const mode of ["dark", "light"]) {
  const file = mode === "dark" ? `${SLUG}.svg` : `${SLUG}-light.svg`;
  fs.writeFileSync(path.join(DIR, file), render(mode), "utf8");
  console.log(`  ✓ ${file}`);
}
