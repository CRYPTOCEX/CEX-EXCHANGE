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

export const footerTradingDisclaimer: Section = section(
  [
    row([
      col(25, [
        el.heading("Proton", {
          level: "h3",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }),
        el.text("Professional-grade crypto trading infrastructure.", {
          fontSize: 14,
          lineHeight: "1.6",
          color: theme.textMuted,
          marginBottom: 16,
          maxWidth: "240px",
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
      col(19, [
        columnHeading("Company"),
        footerLink("About", "#about"),
        footerLink("Blog", "#blog"),
        footerLink("Careers", "#careers"),
        footerLink("Press", "#press"),
        footerLink("Partners", "#partners"),
      ]),
      col(19, [
        columnHeading("Resources"),
        footerLink("Docs", "#docs"),
        footerLink("Guides", "#guides"),
        footerLink("Help Center", "#help"),
        footerLink("Status", "#status"),
        footerLink("Community", "#community"),
      ]),
      col(19, [
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
        el.text("Risk Disclosure", {
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: theme.text,
          marginBottom: 12,
        }),
        el.text(
          "Trading digital assets involves substantial risk of loss and is not suitable for every investor. The valuation of digital assets may fluctuate, and as a result, clients may lose more than their original investment. Before deciding to trade, you should carefully consider your investment objectives, level of experience, and risk appetite. The possibility exists that you could sustain a loss of some or all of your initial investment and therefore you should not invest money that you cannot afford to lose. Leveraged products may not be suitable for all investors. You should be aware of all the risks associated with trading on margin. Past performance is not indicative of future results.",
          {
            fontSize: 12,
            lineHeight: "1.7",
            color: theme.textDim,
            marginBottom: 12,
            maxWidth: "100%",
          }
        ),
        el.text(
          "Proton services are not offered or available to residents of certain jurisdictions, including the United States, Canada, and other restricted territories. It is the sole responsibility of the user to ensure compliance with local laws and regulations before using any of our services. Nothing on this website constitutes financial, legal, tax, or investment advice. Registered office: 12 Finsbury Square, London, EC2A 1AS, United Kingdom.",
          {
            fontSize: 12,
            lineHeight: "1.7",
            color: theme.textDim,
            marginBottom: 24,
            maxWidth: "100%",
          }
        ),
        el.divider({ marginTop: 0, marginBottom: 24, borderColor: theme.border }),
        el.text(`© ${new Date().getFullYear()} Proton Markets, Ltd. All rights reserved.`, {
          fontSize: 14,
          color: theme.textDim,
          marginBottom: 0,
        }),
      ]
    ),
  ],
  {
    name: "Trading Disclaimer Footer",
    description: "Four link columns with a long compliance disclaimer block and copyright",
    category: "footer",
    slug: "footer-trading-disclaimer",
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
