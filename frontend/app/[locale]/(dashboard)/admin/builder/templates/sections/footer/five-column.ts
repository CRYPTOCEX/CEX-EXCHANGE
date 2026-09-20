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

export const footerFiveColumn: Section = section(
  [
    row([
      col(28, [
        el.heading("Bitfinity", {
          level: "h3",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }),
        el.text("The operating system for modern trading — built for teams who move fast.", {
          fontSize: 14,
          lineHeight: "1.6",
          color: theme.textMuted,
          marginBottom: 24,
          maxWidth: "280px",
        }),
      ]),
      col(18, [
        columnHeading("Product"),
        footerLink("Platform", "#platform"),
        footerLink("Trading", "#trading"),
        footerLink("API", "#api"),
        footerLink("Integrations", "#integrations"),
        footerLink("Changelog", "#changelog"),
      ]),
      col(18, [
        columnHeading("Company"),
        footerLink("About", "#about"),
        footerLink("Blog", "#blog"),
        footerLink("Careers", "#careers"),
        footerLink("Press", "#press"),
        footerLink("Partners", "#partners"),
      ]),
      col(18, [
        columnHeading("Resources"),
        footerLink("Docs", "#docs"),
        footerLink("Guides", "#guides"),
        footerLink("Help Center", "#help"),
        footerLink("Status", "#status"),
        footerLink("Community", "#community"),
      ]),
      col(18, [
        columnHeading("Legal"),
        footerLink("Privacy", "#privacy"),
        footerLink("Terms", "#terms"),
        footerLink("Cookie Policy", "#cookies"),
        footerLink("Compliance", "#compliance"),
        footerLink("Disclosures", "#disclosures"),
      ]),
    ]),
    singleColumnRow(
      [
        el.divider({ marginTop: 48, marginBottom: 24, borderColor: theme.border }),
        el.text(`© ${new Date().getFullYear()} Bitfinity, Inc. All rights reserved.`, {
          fontSize: 14,
          color: theme.textDim,
          marginBottom: 0,
        }),
      ]
    ),
  ],
  {
    name: "Five Column Footer",
    description: "Logo with tagline plus four link columns (Product, Company, Resources, Legal)",
    category: "footer",
    slug: "footer-five-column",
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
