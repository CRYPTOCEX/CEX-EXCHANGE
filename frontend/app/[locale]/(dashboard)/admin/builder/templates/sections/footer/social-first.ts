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

const socialButton = (name: string) =>
  el.icon(name, {
    size: 22,
    color: theme.onBand,
    marginBottom: 0,
    marginRight: 12,
    display: "inline-block",
    backgroundColor: theme.primary,
    borderRadius: 999,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
  });

export const footerSocialFirst: Section = section(
  [
    row([
      col(40, [
        el.heading("Vantari", {
          level: "h3",
          fontSize: 24,
          fontWeight: "700",
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }),
        el.text("Follow our journey across the channels that matter most.", {
          fontSize: 14,
          lineHeight: "1.6",
          color: theme.textMuted,
          marginBottom: 24,
          maxWidth: "320px",
        }),
        socialButton("lucide:twitter"),
        socialButton("lucide:github"),
        socialButton("lucide:linkedin"),
        socialButton("lucide:youtube"),
        socialButton("lucide:discord"),
      ]),
      col(20, [
        columnHeading("Product"),
        footerLink("Platform", "#platform"),
        footerLink("Pricing", "#pricing"),
        footerLink("Changelog", "#changelog"),
      ]),
      col(20, [
        columnHeading("Company"),
        footerLink("About", "#about"),
        footerLink("Careers", "#careers"),
        footerLink("Contact", "#contact"),
      ]),
      col(20, [
        columnHeading("Legal"),
        footerLink("Privacy", "#privacy"),
        footerLink("Terms", "#terms"),
        footerLink("Cookie Policy", "#cookies"),
      ]),
    ]),
    singleColumnRow(
      [
        el.divider({ marginTop: 48, marginBottom: 24, borderColor: theme.border }),
        el.text(`© ${new Date().getFullYear()} Vantari, Inc. All rights reserved.`, {
          fontSize: 14,
          color: theme.textDim,
          marginBottom: 0,
        }),
      ]
    ),
  ],
  {
    name: "Social First Footer",
    description: "Emphasized social icons with compact three-column links and a copyright bar",
    category: "footer",
    slug: "footer-social-first",
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
