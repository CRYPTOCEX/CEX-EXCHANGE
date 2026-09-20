import type { Section } from "@/types/builder";
import { el, row, col, section, singleColumnRow, theme, gradients } from "../../utils";

const columnHeading = (label: string) =>
  el.text(label, {
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    marginBottom: 16,
    color: theme.onBand,
  });

const footerLink = (label: string, href: string) =>
  el.link(label, href, {
    display: "block",
    marginBottom: 8,
    fontSize: 14,
    color: theme.onBandDim,
  });

export const footerSplitCta: Section = section(
  [
    // Top half — CTA
    row(
      [
        col(60, [
          el.heading("Start your trial today", {
            level: "h2",
            fontSize: 44,
            fontWeight: "700",
            marginBottom: 12,
            letterSpacing: "-0.02em",
            color: theme.onBand,
          }),
          el.text("No credit card required. Cancel any time. Get full access for 14 days.", {
            fontSize: 17,
            lineHeight: "1.6",
            color: theme.onBandMuted,
            marginBottom: 0,
            maxWidth: "520px",
          }),
        ]),
        col(40, [
          el.button("Start your trial", "/signup", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            size: "lg",
            fontSize: 16,
            fontWeight: "600",
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 32,
            paddingRight: 32,
            marginRight: 12,
            marginTop: 8,
          }),
          el.button("Contact sales", "#contact", {
            backgroundColor: theme.onBandFill,
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandBorder,
            size: "lg",
            fontSize: 16,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 32,
            paddingRight: 32,
            marginRight: 0,
            marginTop: 8,
          }),
        ], { textAlign: "right", verticalAlign: "middle" }),
      ],
      {
        paddingTop: 72,
        paddingBottom: 72,
        paddingLeft: 24,
        paddingRight: 24,
        maxWidth: "1200px",
        verticalAlign: "middle",
      }
    ),
    // Divider
    singleColumnRow(
      [
        el.divider({
          marginTop: 0,
          marginBottom: 0,
          borderColor: theme.onBandFill,
        }),
      ],
      { maxWidth: "100%", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }
    ),
    // Bottom half — links + copyright
    row([
      col(25, [
        columnHeading("Product"),
        footerLink("Platform", "#platform"),
        footerLink("Pricing", "#pricing"),
        footerLink("Changelog", "#changelog"),
      ]),
      col(25, [
        columnHeading("Company"),
        footerLink("About", "#about"),
        footerLink("Blog", "#blog"),
        footerLink("Careers", "#careers"),
      ]),
      col(25, [
        columnHeading("Resources"),
        footerLink("Docs", "#docs"),
        footerLink("Help Center", "#help"),
        footerLink("Status", "#status"),
      ]),
      col(25, [
        columnHeading("Legal"),
        footerLink("Privacy", "#privacy"),
        footerLink("Terms", "#terms"),
        footerLink("Compliance", "#compliance"),
      ]),
    ], {
      paddingTop: 56,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
      maxWidth: "1200px",
    }),
    singleColumnRow(
      [
        el.divider({
          marginTop: 16,
          marginBottom: 24,
          borderColor: theme.onBandFill,
        }),
        el.text(`© ${new Date().getFullYear()} Meridian, Inc. All rights reserved.`, {
          fontSize: 14,
          color: theme.onBandDim,
          marginBottom: 0,
        }),
      ],
      { paddingLeft: 24, paddingRight: 24, paddingBottom: 24 }
    ),
  ],
  {
    name: "Split CTA Footer",
    description: "Dark top half with a big CTA (Start your trial) and bottom half with links and copyright",
    category: "footer",
    slug: "footer-split-cta",
    type: "fullwidth",
    settings: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      backgroundColor: gradients.nightSky,
    },
  }
);
