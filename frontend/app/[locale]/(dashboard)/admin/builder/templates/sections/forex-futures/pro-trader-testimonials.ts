import type { Section, Element } from "@/types/builder";
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

const testimonialCard = (
  quote: string,
  name: string,
  role: string,
  metric: string,
  metricLabel: string,
  avatarSrc: string
): Element =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 36,
      boxShadowX: 0,
      boxShadowY: 12,
      boxShadowBlur: 36,
      boxShadowSpread: -12,
      boxShadowColor: "rgba(10,18,32,0.06)",
    },
    [
      el.icon("lucide:quote", {
        size: 36,
        color: theme.primary,
        marginBottom: 20,
      }),
      el.text(quote, {
        fontSize: 17,
        color: theme.text,
        lineHeight: "1.6",
        marginBottom: 28,
        fontStyle: "italic",
      }),
      el.card(
        {
          backgroundColor: theme.bgMuted,
          borderWidth: 0,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        },
        [
          el.text(metric, {
            fontSize: 28,
            fontWeight: "800",
            color: theme.emerald,
            letterSpacing: "-0.02em",
            marginBottom: 2,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }),
          el.text(metricLabel, {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            marginBottom: 0,
          }),
        ]
      ),
      el.text(
        `<div style="display:flex;align-items:center;gap:14px;"><img src="${avatarSrc}" alt="Portrait of ${name}" style="width:56px;height:56px;border-radius:999px;object-fit:cover;flex-shrink:0;" /><div><div style="font-weight:700;font-size:15px;color:#09090b;">${name}</div><div style="font-size:13px;color:#71717a;">${role}</div></div></div>`,
        { marginBottom: 0 }
      ),
    ]
  );

export const forexFuturesProTraderTestimonials: Section = section(
  [
    singleColumnRow([
      el.text("PROFESSIONAL TRADERS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Why serious forex and futures desks choose us", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "From boutique prop shops to multi-strategy funds, our platform handles the volume and latency demands of real money.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          testimonialCard(
            "The spreads are genuinely raw during London session. I used to pay 120 pips in roundtrip costs on a standard week — now it's under 30. That alone justifies the switch.",
            "James Whitfield",
            "Senior FX Trader · Kingsland Prop",
            "+67%",
            "YTD ACCOUNT GROWTH",
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80"
          ),
        ]),
        col(33.33, [
          testimonialCard(
            "A signed API, fills that hold up through NFP, and a matching engine that doesn't choke. It's what I got from my old prime broker for 10% of the price.",
            "Aiko Nakamura",
            "Portfolio Manager · Tsukimi Futures",
            "2,400",
            "LOTS PER WEEK",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80"
          ),
        ]),
        col(33.33, [
          testimonialCard(
            "I run scalping algos on EUR/USD and USD/JPY. Zero requotes across 18 months of live trading. The data integrity is the best I've ever seen from a retail-accessible broker.",
            "Ricardo Alves",
            "Systematic Trader · Algomind",
            "0.002%",
            "AVG SLIPPAGE PER FILL",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80"
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Pro Trader Testimonials",
    description: "Three testimonial cards featuring forex and futures traders with metrics",
    category: "forex-futures",
    slug: "forex-futures-pro-trader-testimonials",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
