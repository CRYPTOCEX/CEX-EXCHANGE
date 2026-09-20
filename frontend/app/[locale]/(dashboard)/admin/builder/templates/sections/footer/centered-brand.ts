import type { Section } from "@/types/builder";
import { el, section, singleColumnRow, theme } from "../../utils";

const inlineLink = (label: string, href: string, last = false) =>
  el.link(label, href, {
    marginRight: last ? 0 : 28,
    fontSize: 14,
    color: theme.textMuted,
    display: "inline-block",
  });

const socialIcon = (name: string, last = false) =>
  el.icon(name, {
    size: 20,
    color: theme.textMuted,
    marginBottom: 0,
    marginRight: last ? 0 : 20,
    display: "inline-block",
  });

export const footerCenteredBrand: Section = section(
  [
    singleColumnRow(
      [
        el.heading("Numeris", {
          level: "h3",
          fontSize: 28,
          fontWeight: "700",
          marginBottom: 12,
          letterSpacing: "-0.02em",
          textAlign: "center",
        }),
        el.text("Precision tools for the modern portfolio manager.", {
          fontSize: 15,
          lineHeight: "1.6",
          color: theme.textMuted,
          marginBottom: 32,
          textAlign: "center",
          maxWidth: "480px",
        }),
      ],
      { textAlign: "center" }
    ),
    singleColumnRow(
      [
        inlineLink("Product", "#product"),
        inlineLink("Pricing", "#pricing"),
        inlineLink("Docs", "#docs"),
        inlineLink("Blog", "#blog"),
        inlineLink("Careers", "#careers"),
        inlineLink("Contact", "#contact", true),
      ],
      { textAlign: "center", marginBottom: 24 }
    ),
    singleColumnRow(
      [
        socialIcon("lucide:twitter"),
        socialIcon("lucide:github"),
        socialIcon("lucide:linkedin"),
        socialIcon("lucide:youtube"),
        socialIcon("lucide:discord", true),
      ],
      { textAlign: "center", marginBottom: 24 }
    ),
    singleColumnRow(
      [
        el.divider({ marginTop: 32, marginBottom: 24, borderColor: theme.border }),
        el.text(`© ${new Date().getFullYear()} Numeris, Inc. All rights reserved.`, {
          fontSize: 14,
          color: theme.textDim,
          marginBottom: 0,
          textAlign: "center",
        }),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Centered Brand Footer",
    description: "Centered layout with logo, tagline, single row of links, social icons, and copyright",
    category: "footer",
    slug: "footer-centered-brand",
    settings: {
      paddingTop: 80,
      paddingBottom: 40,
      paddingLeft: 24,
      paddingRight: 24,
      backgroundColor: theme.bgSubtle,
      borderTop: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
    },
  }
);
