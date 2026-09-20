import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

const avatarRow = () => {
  const avatars = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&q=80",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80",
  ];
  const imgs = avatars
    .map(
      (src, i) =>
        `<img src="${src}" alt="" style="width:52px;height:52px;border-radius:999px;border:3px solid #ffffff;margin-left:${i === 0 ? 0 : -14}px;box-shadow:0 4px 12px rgba(15,23,42,0.15);position:relative;z-index:${10 - i};" />`
    )
    .join("");
  return `<div style="display:inline-flex;align-items:center;">${imgs}<div style="margin-left:16px;font-size:14px;color:#71717a;font-weight:600;">+840,000 more</div></div>`;
};

const flagRow = () => {
  const flags = ["🇺🇸", "🇬🇧", "🇯🇵", "🇸🇬", "🇩🇪", "🇨🇦", "🇦🇺", "🇧🇷", "🇳🇱", "🇿🇦", "🇰🇷", "🇮🇳", "🇦🇪", "🇨🇭", "🇸🇪"];
  return flags
    .map(
      (f) =>
        `<span style="display:inline-block;font-size:28px;margin:0 4px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));">${f}</span>`
    )
    .join("");
};

export const copyTradingSocialProofCopiers: Section = section(
  [
    singleColumnRow([
      el.text("GLOBAL COMMUNITY", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 14,
      }),
      el.heading("Join 840,000+ copiers worldwide", {
        textAlign: "center",
        fontSize: 52,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1.05",
        marginBottom: 20,
        maxWidth: "900px",
      }),
      el.text(
        "From retail investors in Tokyo to hedge funds in London, traders in 184 countries trust our platform to mirror the best strategies in the world.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "720px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
      el.text(avatarRow(), {
        textAlign: "center",
        marginBottom: 48,
      }),
      el.divider({ marginTop: 0, marginBottom: 40 }),
      el.text("TRUSTED IN 184 COUNTRIES", {
        fontSize: 11,
        fontWeight: "800",
        color: theme.textDim,
        letterSpacing: "0.2em",
        textAlign: "center",
        marginBottom: 20,
      }),
      el.text(flagRow(), {
        textAlign: "center",
        marginBottom: 48,
      }),
    ]),
    row(
      [
        col(33.33, [
          el.text("840K+", {
            fontSize: 48,
            fontWeight: "800",
            color: theme.text,
            textAlign: "center",
            letterSpacing: "-0.03em",
            marginBottom: 6,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }),
          el.text("ACTIVE COPIERS", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.16em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(33.33, [
          el.text("4,200", {
            fontSize: 48,
            fontWeight: "800",
            color: theme.text,
            textAlign: "center",
            letterSpacing: "-0.03em",
            marginBottom: 6,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }),
          el.text("VERIFIED TRADERS", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.16em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(33.33, [
          el.text("184", {
            fontSize: 48,
            fontWeight: "800",
            color: theme.text,
            textAlign: "center",
            letterSpacing: "-0.03em",
            marginBottom: 6,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }),
          el.text("COUNTRIES", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.16em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
      ],
      { ...rowPresets.narrow, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Social Proof Copiers",
    description: "Social proof section with avatar row, country flags, and global stats",
    category: "copy-trading",
    slug: "copy-trading-social-proof-copiers",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
