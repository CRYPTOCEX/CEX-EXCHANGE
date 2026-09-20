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

const storeButton = (primary: string, secondary: string, iconName: string, last = false) =>
  el.link(
    `<span style="display:flex;align-items:center;gap:12px;"><span style="font-size:28px;">${iconName}</span><span style="display:flex;flex-direction:column;line-height:1.2;"><span style="font-size:11px;opacity:0.75;">${secondary}</span><span style="font-size:16px;font-weight:600;">${primary}</span></span></span>`,
    "#",
    {
      display: "inline-flex",
      alignItems: "center",
      backgroundColor: theme.bandInk,
      color: theme.onBand,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 20,
      paddingRight: 20,
      borderRadius: 12,
      marginRight: last ? 0 : 12,
      marginBottom: 8,
      fontSize: 14,
    }
  );

export const footerAppDownload: Section = section(
  [
    // Top band — tagline + store buttons
    row([
      col(50, [
        el.heading("Ascend", {
          level: "h3",
          fontSize: 24,
          fontWeight: "700",
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }),
        el.text("Trade, track, and manage your portfolio on the go.", {
          fontSize: 15,
          lineHeight: "1.6",
          color: theme.textMuted,
          marginBottom: 0,
          maxWidth: "420px",
        }),
      ]),
      col(50, [
        el.text("Download our app", {
          fontSize: 13,
          fontWeight: "600",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: theme.text,
          marginBottom: 16,
          textAlign: "right",
        }),
        storeButton("App Store", "Download on the", "🍎"),
        storeButton("Google Play", "Get it on", "▶", true),
      ], { textAlign: "right" }),
    ]),
    singleColumnRow(
      [el.divider({ marginTop: 48, marginBottom: 48, borderColor: theme.border })]
    ),
    // Link columns
    row([
      col(25, [
        columnHeading("Product"),
        footerLink("Platform", "#platform"),
        footerLink("Trading", "#trading"),
        footerLink("API", "#api"),
        footerLink("Integrations", "#integrations"),
        footerLink("Changelog", "#changelog"),
      ]),
      col(25, [
        columnHeading("Company"),
        footerLink("About", "#about"),
        footerLink("Blog", "#blog"),
        footerLink("Careers", "#careers"),
        footerLink("Press", "#press"),
        footerLink("Partners", "#partners"),
      ]),
      col(25, [
        columnHeading("Resources"),
        footerLink("Docs", "#docs"),
        footerLink("Guides", "#guides"),
        footerLink("Help Center", "#help"),
        footerLink("Status", "#status"),
        footerLink("Community", "#community"),
      ]),
      col(25, [
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
        el.text(`© ${new Date().getFullYear()} Ascend, Inc. All rights reserved.`, {
          fontSize: 14,
          color: theme.textDim,
          marginBottom: 0,
        }),
      ]
    ),
  ],
  {
    name: "App Download Footer",
    description: "Logo with tagline and app store buttons on top, link columns and copyright below",
    category: "footer",
    slug: "footer-app-download",
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
