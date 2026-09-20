import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

export const ctaDoubleCta: Section = section(
  [
    singleColumnRow([
      el.heading("Pick the path that fits your trading", {
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        lineHeight: "1.1",
        marginBottom: 16,
      }),
      el.text(
        "Whether you're automating your first strategy or scaling a desk, we have a lane for you.",
        {
          fontSize: 18,
          textAlign: "center",
          marginBottom: 48,
          maxWidth: "620px",
          marginLeft: "auto",
          marginRight: "auto",
        }
      ),
    ]),
    row(
      [
        col(50, [
          el.card(
            {
              backgroundColor: gradients.skyEmerald,
              borderWidth: 0,
              borderRadius: 20,
              padding: 48,
              minHeight: "380px",
            },
            []
          ),
          el.text("FOR INDIVIDUALS", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.onBand,
            letterSpacing: "0.14em",
            marginBottom: 14,
            marginTop: -340,
            paddingLeft: 48,
          }),
          el.heading("Automate your personal trading", {
            fontSize: 30,
            fontWeight: "800",
            letterSpacing: "-0.02em",
            color: theme.onBand,
            lineHeight: "1.15",
            marginBottom: 14,
            paddingLeft: 48,
            paddingRight: 48,
          }),
          el.text(
            "From no-code signals to full Python strategies. Under $10/mo.",
            {
              fontSize: 16,
              color: theme.onBandMuted,
              marginBottom: 24,
              paddingLeft: 48,
              paddingRight: 48,
            }
          ),
          el.button("Start free trial", "/signup", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 15,
            marginLeft: 48,
            marginBottom: 48,
          }),
        ]),
        col(50, [
          el.card(
            {
              backgroundColor: gradients.indigoViolet,
              borderWidth: 0,
              borderRadius: 20,
              padding: 48,
              minHeight: "380px",
            },
            []
          ),
          el.text("FOR TEAMS & DESKS", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.onBand,
            letterSpacing: "0.14em",
            marginBottom: 14,
            marginTop: -340,
            paddingLeft: 48,
          }),
          el.heading("Institutional infrastructure", {
            fontSize: 30,
            fontWeight: "800",
            letterSpacing: "-0.02em",
            color: theme.onBand,
            lineHeight: "1.15",
            marginBottom: 14,
            paddingLeft: 48,
            paddingRight: 48,
          }),
          el.text(
            "SSO, custom limits, dedicated support. Built for scale.",
            {
              fontSize: 16,
              color: theme.onBandMuted,
              marginBottom: 24,
              paddingLeft: 48,
              paddingRight: 48,
            }
          ),
          el.button("Talk to sales", "/contact", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 15,
            marginLeft: 48,
            marginBottom: 48,
          }),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Double CTA Tiles",
    description: "Two large feature tiles side-by-side, each with its own distinct CTA",
    category: "cta",
    slug: "cta-double-cta",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
