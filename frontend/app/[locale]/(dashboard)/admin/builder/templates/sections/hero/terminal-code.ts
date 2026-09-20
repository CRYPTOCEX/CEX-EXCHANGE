import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

/* The terminal window is a DELIBERATE dark band: it stays near-black in both
   themes (a terminal that turned white on a light page would stop reading as a
   terminal), so its neutral ink is pinned with the `onBand*` scale.

   The four ANSI accent hues below are left as literals ON PURPOSE. They are a
   syntax palette on a pinned ground, and the vocabulary has no "accent ink for
   a dark band" token — the theme-following accents are tuned for the page
   surface and collapse here in LIGHT mode, measured over `bandInk`:
     cssInfo 2.79:1 · cssViolet 3.59:1 · cssPrimary 4.11:1 · cssDestructive 4.15:1
   while the literals below sit at 6.9–11.2:1 in both themes. Swapping them
   would be a contrast regression, not a migration. */
const TERMINAL_HTML = `<div style="font-family: 'JetBrains Mono', 'Fira Code', Menlo, monospace; font-size: 13px; line-height: 1.75; color: ${theme.onBand};">
<div style="color: ${theme.onBandDim};">$ curl -fsSL https://install.apex.dev | sh</div>
<div style="color: ${theme.onBandMuted};">Resolving host...</div>
<div style="color: #34d399;">&#10003; downloaded apex-cli 2.4.1</div>
<div style="color: #34d399;">&#10003; installed to ~/.apex/bin</div>
<div style="color: ${theme.onBandDim};">$ apex init trading-bot</div>
<div style="color: #38bdf8;">&#9889; scaffolded trading-bot in 212 ms</div>
<div style="color: ${theme.onBandDim};">$ apex deploy</div>
<div style="color: #fbbf24;">&#10140; building images...</div>
<div style="color: #34d399;">&#10003; deployed to apex.dev/tb-9f3a</div>
<div style="color: #a78bfa;">&#9679; live at https://tb-9f3a.apex.dev</div>
</div>`;

export const heroTerminalCode: Section = section(
  [
    row(
      [
        col(50, [
          el.text("DEVELOPER PLATFORM", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.emerald,
            letterSpacing: "0.14em",
            marginBottom: 20,
          }),
          el.heading("Deploy production apps from your terminal", {
            level: "h1",
            fontSize: 60,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.06",
            color: theme.text,
            marginBottom: 20,
          }),
          el.text(
            "One CLI. Zero YAML. Ship containers, workers, and cron jobs to a global edge network in seconds.",
            {
              fontSize: 19,
              color: theme.textMuted,
              marginBottom: 32,
              lineHeight: "1.65",
              maxWidth: "480px",
            }
          ),
          el.button("Install the CLI", "/install", {
            fontSize: 16,
            marginRight: 12,
          }),
          el.button("Read the docs", "/docs", {
            backgroundColor: "transparent",
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            fontSize: 16,
          }),
        ]),
        col(50, [
          el.text(
            /* Window chrome. The three dots are decorative UI graphics, not
               text, so the theme-following `css*` accents are safe here — over
               `bandInk` they measure 4.15 / 5.21 / 5.53 : 1 in light mode and
               higher in dark, all clear of the 3:1 non-text floor. */
            `<div style="display:flex;gap:8px;padding:14px 16px;border-bottom:1px solid ${theme.onBandBorder};">
              <span style="width:12px;height:12px;border-radius:50%;background:${theme.cssDestructive};display:inline-block;"></span>
              <span style="width:12px;height:12px;border-radius:50%;background:${theme.cssWarning};display:inline-block;"></span>
              <span style="width:12px;height:12px;border-radius:50%;background:${theme.cssSuccess};display:inline-block;"></span>
              <span style="margin-left:auto;color:${theme.onBandDim};font-family:monospace;font-size:12px;">~/projects/trading-bot</span>
            </div>`,
            {
              backgroundColor: theme.bandInk,
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              marginBottom: 0,
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
            }
          ),
          el.text(TERMINAL_HTML, {
            // Same pinned ground as the title bar; the `onBandBorder` hairline
            // above is what separates the two.
            backgroundColor: theme.bandInk,
            borderBottomLeftRadius: 14,
            borderBottomRightRadius: 14,
            paddingTop: 24,
            paddingBottom: 28,
            paddingLeft: 24,
            paddingRight: 24,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandFill,
            boxShadowX: 0,
            boxShadowY: 32,
            boxShadowBlur: 64,
            boxShadowColor: "rgba(10,18,32,0.25)",
          }),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56 }
    ),
  ],
  {
    name: "Terminal Code Hero",
    description: "Developer hero with split copy and a mock terminal window on the right",
    category: "hero",
    slug: "hero-terminal-code",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: theme.bgBase,
    },
  }
);
