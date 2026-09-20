#!/usr/bin/env node
/**
 * Store art for the AI Support Agent addon, in both themes.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS GENERATED RATHER THAN POST-PROCESSED
 * ---------------------------------------------------------------------------
 * The obvious shortcut — author the dark file and swap four colours to make a
 * light one — is what the rest of this art set does NOT do, and for two reasons
 * that only show up once you look at the result:
 *
 *   1. NOT EVERY WHITE IS INK. A `#ffffff` glyph sitting ON a bright accent
 *      fill (the "M" in the logo tile, the robot inside the accent square, the
 *      label on the filled card) has to STAY white in both themes — the accent
 *      behind it does not change. A blanket `#ffffff → #0f172a` turns those
 *      dark-on-violet and they disappear. The store's generator keeps them in a
 *      separate `ONDARK` constant for exactly this reason; here they are
 *      literal `#ffffff` and never touched by `INK`.
 *
 *   2. ACCENT-COLOURED STROKES WASH OUT ON WHITE. A hairline in a light violet
 *      reads fine on near-black and vanishes on `#f6f8fb`. The store swaps
 *      those to slate on the light pass (`wire()`); the same applies here.
 *
 * Mirrors `store/scripts/generate-thumbnails.ts`. The other 33 files in this
 * directory come from that generator directly — only this product is authored
 * here, because it is not in the store's catalogue config.
 *
 *   node scripts/build-ai-support-art.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, "..", "public", "img", "store");
const SLUG = "ai-support-agent";

const FONT = `Inter, 'Segoe UI', -apple-system, system-ui, sans-serif`;

/** Accent pair. Unchanged across themes — chromatic enough for both grounds. */
const ACC_A = "#6366f1";
const ACC_B = "#8b5cf6";
const GREEN = "#34d399";
const AMBER = "#fbbf24";

/**
 * Text and glyphs that sit ON a bright accent fill.
 *
 * Constant white in BOTH themes. If these followed INK they would turn dark on
 * a violet tile and vanish in light mode — the single most common way a
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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" width="1200" height="720" role="img" aria-label="AI Support Agent">
<style>
@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes pu{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes bl{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes ty{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-4px);opacity:1}}
@keyframes be{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.af{animation:fl 9s ease-in-out infinite}
.ap{animation:pu 6s ease-in-out infinite}
.ab{animation:bl 4s ease-in-out infinite}
.abe{transform-box:fill-box;transform-origin:center;animation:be 6s ease-in-out infinite}
.d1{transform-box:fill-box;animation:ty 1.3s ease-in-out infinite}
.d2{transform-box:fill-box;animation:ty 1.3s ease-in-out .18s infinite}
.d3{transform-box:fill-box;animation:ty 1.3s ease-in-out .36s infinite}
@media (prefers-reduced-motion:reduce){.af,.ap,.ab,.abe,.d1,.d2,.d3{animation:none}}
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
  ${text(670, 125, 16, INK, "Support Inbox", { weight: 600, op: 0.55 })}
</g>

<g class="af">
  <rect x="622" y="171" width="76" height="76" rx="20" fill="url(#acc)" class="abe"/>
  <rect x="640" y="196" width="40" height="28" rx="9" fill="none" stroke="${ONDARK}" stroke-width="2.6" stroke-opacity="0.95"/>
  <circle cx="652" cy="210" r="3.4" fill="${ONDARK}"/>
  <circle cx="668" cy="210" r="3.4" fill="${ONDARK}"/>
  <path d="M660 196 v-8" stroke="${ONDARK}" stroke-width="2.6" stroke-linecap="round" stroke-opacity="0.95"/>
  <circle cx="660" cy="185" r="3.2" fill="${ONDARK}"/>
</g>

${text(722, 212, 46, GREEN, "73%", { weight: 800 })}
${text(722, 240, 17, INK, "resolved without a human", { op: 0.6 })}
<circle class="ab" cx="1122" cy="196" r="5" fill="${GREEN}"/>
${text(1062, 202, 14, INK, "LIVE", { weight: 700, op: 0.55 })}

<g>
  <rect x="622" y="278" width="286" height="52" rx="14" fill="${INK}" fill-opacity="0.05" stroke="${INK}" stroke-opacity="0.08"/>
  <rect x="640" y="295" width="180" height="7" rx="3.5" fill="${INK}" fill-opacity="0.4"/>
  <rect x="640" y="310" width="126" height="6" rx="3" fill="${INK}" fill-opacity="0.22"/>
</g>

<g>
  <rect x="738" y="346" width="386" height="76" rx="14" fill="${ACC_A}" fill-opacity="${p.light ? 0.1 : 0.16}" stroke="${p.wire(ACC_A)}" stroke-opacity="0.45"/>
  <rect x="758" y="366" width="286" height="7" rx="3.5" fill="${INK}" fill-opacity="0.72"/>
  <rect x="758" y="382" width="232" height="7" rx="3.5" fill="${INK}" fill-opacity="0.5"/>
  <g>
    <rect x="758" y="398" width="92" height="16" rx="8" fill="${ACC_B}" fill-opacity="0.32"/>
    <circle cx="769" cy="406" r="3.2" fill="${INK}" fill-opacity="0.85"/>
    <rect x="778" y="403" width="60" height="6" rx="3" fill="${INK}" fill-opacity="0.6"/>
  </g>
  <g>
    <rect x="860" y="398" width="76" height="16" rx="8" fill="${ACC_B}" fill-opacity="0.32"/>
    <circle cx="871" cy="406" r="3.2" fill="${INK}" fill-opacity="0.85"/>
    <rect x="880" y="403" width="44" height="6" rx="3" fill="${INK}" fill-opacity="0.6"/>
  </g>
</g>

<g>
  <rect x="622" y="346" width="86" height="34" rx="17" fill="${INK}" fill-opacity="0.05" stroke="${INK}" stroke-opacity="0.08"/>
  <circle class="d1" cx="644" cy="363" r="4.2" fill="${ACC_A}"/>
  <circle class="d2" cx="660" cy="363" r="4.2" fill="#7c6ff2"/>
  <circle class="d3" cx="676" cy="363" r="4.2" fill="${ACC_B}"/>
</g>

<g>
  <rect x="622" y="466" width="152" height="60" rx="14" fill="${SURFACE}" stroke="${p.wire(ACC_A)}" stroke-opacity="0.4" stroke-width="2"/>
  ${text(698, 492, 16, INK, "Tickets", { weight: 700, anchor: "middle", op: 0.9 })}
  ${text(698, 514, 13, INK, "Answered 24/7", { anchor: "middle", op: 0.5 })}
</g>
<g>
  <rect x="794" y="466" width="152" height="60" rx="14" fill="url(#acc)" fill-opacity="0.9"/>
  ${text(870, 492, 16, ONDARK, "Live chat", { weight: 700, anchor: "middle" })}
  ${text(870, 514, 13, ONDARK, "Replies in seconds", { anchor: "middle", op: 0.8 })}
</g>
<g>
  <rect x="966" y="466" width="152" height="60" rx="14" fill="${SURFACE}" stroke="${p.wire(AMBER)}" stroke-opacity="0.4" stroke-width="2"/>
  ${text(1042, 492, 16, INK, "Escalation", { weight: 700, anchor: "middle", op: 0.9 })}
  ${text(1042, 514, 13, INK, "Money to a human", { anchor: "middle", op: 0.5 })}
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
${text(64, 300, 64, INK, "AI Support", { weight: 800, ls: "-2" })}
${text(64, 374, 64, INK, "Agent", { weight: 800, ls: "-2" })}
${text(64, 430, 27, INK, "Answers most tickets instantly,", { op: 0.72 })}
${text(64, 468, 27, INK, "so your team only sees the rest.", { op: 0.72 })}
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
