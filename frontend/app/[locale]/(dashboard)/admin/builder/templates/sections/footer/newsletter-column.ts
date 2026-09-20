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

export const footerNewsletterColumn: Section = section(
  [
    row([
      col(16, [
        columnHeading("Product"),
        footerLink("Platform", "#platform"),
        footerLink("Trading", "#trading"),
        footerLink("API", "#api"),
        footerLink("Integrations", "#integrations"),
        footerLink("Changelog", "#changelog"),
      ]),
      col(16, [
        columnHeading("Company"),
        footerLink("About", "#about"),
        footerLink("Blog", "#blog"),
        footerLink("Careers", "#careers"),
        footerLink("Press", "#press"),
        footerLink("Partners", "#partners"),
      ]),
      col(16, [
        columnHeading("Resources"),
        footerLink("Docs", "#docs"),
        footerLink("Guides", "#guides"),
        footerLink("Help Center", "#help"),
        footerLink("Status", "#status"),
        footerLink("Community", "#community"),
      ]),
      col(16, [
        columnHeading("Legal"),
        footerLink("Privacy", "#privacy"),
        footerLink("Terms", "#terms"),
        footerLink("Cookie Policy", "#cookies"),
        footerLink("Compliance", "#compliance"),
        footerLink("Disclosures", "#disclosures"),
      ]),
      col(36, [
        columnHeading("Stay in the loop"),
        el.text("Monthly dispatches on new features, market insights, and engineering deep-dives.", {
          fontSize: 14,
          lineHeight: "1.6",
          color: theme.textMuted,
          marginBottom: 20,
        }),
        el.text(
          '<input type="email" placeholder="you@company.com" style="width:100%;padding:12px 14px;border:1px solid #e4e4e7;border-radius:10px;font-size:14px;background:transparent;" />',
          { marginBottom: 12 }
        ),
        el.button("Subscribe", "#subscribe", {
          size: "md",
          fontSize: 14,
          width: "100%",
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 20,
          paddingRight: 20,
          marginRight: 0,
          marginTop: 0,
          textAlign: "center",
        }),
      ]),
    ]),
    singleColumnRow(
      [
        el.divider({ marginTop: 48, marginBottom: 24, borderColor: theme.border }),
        el.text(`© ${new Date().getFullYear()} Helios, Inc. All rights reserved.`, {
          fontSize: 14,
          color: theme.textDim,
          marginBottom: 0,
        }),
      ]
    ),
  ],
  {
    name: "Newsletter Column Footer",
    description: "Four link columns with a newsletter signup panel on the right",
    category: "footer",
    slug: "footer-newsletter-column",
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
