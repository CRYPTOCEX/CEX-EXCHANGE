import type { Section } from "@/types/builder";
import { el, row, col, section, singleColumnRow, theme } from "../../utils";

const columnHeading = (label: string) =>
  el.text(label, {
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    marginBottom: 16,
    color: theme.text,
  });

const footerLink = (label: string, href: string) =>
  el.link(label, href, {
    display: "block",
    marginBottom: 8,
    fontSize: 14,
    color: theme.textMuted,
  });

const socialIcon = (name: string) =>
  el.icon(name, {
    size: 20,
    color: theme.textMuted,
    marginBottom: 0,
    marginRight: 16,
    display: "inline-block",
  });

export const footerMegaFooter: Section = section(
  [
    row([
      col(28, [
        el.heading("Terracap", {
          level: "h3",
          fontSize: 24,
          fontWeight: "700",
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }),
        el.text(
          "Institutional-grade infrastructure for the next generation of financial products. Trade, build, and scale on one unified platform.",
          {
            fontSize: 14,
            lineHeight: "1.7",
            color: theme.textMuted,
            marginBottom: 24,
            maxWidth: "320px",
          }
        ),
        socialIcon("lucide:twitter"),
        socialIcon("lucide:github"),
        socialIcon("lucide:linkedin"),
        socialIcon("lucide:youtube"),
        socialIcon("lucide:discord"),
      ]),
      col(14, [
        columnHeading("Product"),
        footerLink("Platform", "#platform"),
        footerLink("Trading", "#trading"),
        footerLink("API", "#api"),
        footerLink("Integrations", "#integrations"),
        footerLink("Changelog", "#changelog"),
      ]),
      col(14, [
        columnHeading("Company"),
        footerLink("About", "#about"),
        footerLink("Blog", "#blog"),
        footerLink("Careers", "#careers"),
        footerLink("Press", "#press"),
        footerLink("Partners", "#partners"),
      ]),
      col(14, [
        columnHeading("Resources"),
        footerLink("Docs", "#docs"),
        footerLink("Guides", "#guides"),
        footerLink("Help Center", "#help"),
        footerLink("Status", "#status"),
        footerLink("Community", "#community"),
      ]),
      col(14, [
        columnHeading("Legal"),
        footerLink("Privacy", "#privacy"),
        footerLink("Terms", "#terms"),
        footerLink("Cookie Policy", "#cookies"),
        footerLink("Compliance", "#compliance"),
        footerLink("Disclosures", "#disclosures"),
      ]),
      col(16, [
        columnHeading("Solutions"),
        footerLink("Enterprise", "#enterprise"),
        footerLink("Startups", "#startups"),
        footerLink("Developers", "#developers"),
        footerLink("Institutions", "#institutions"),
        footerLink("Security", "#security"),
      ]),
    ]),
    singleColumnRow(
      [
        el.divider({ marginTop: 56, marginBottom: 24, borderColor: theme.border }),
        el.text(`© ${new Date().getFullYear()} Terracap, Inc. All rights reserved.`, {
          fontSize: 14,
          color: theme.textDim,
          marginBottom: 0,
        }),
      ]
    ),
  ],
  {
    name: "Mega Footer",
    description: "Six-column footer with logo, tagline, social icons, and link columns",
    category: "footer",
    slug: "footer-mega-footer",
    settings: {
      paddingTop: 96,
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
