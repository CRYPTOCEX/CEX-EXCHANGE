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

const regulatorBadge = (abbr: string, fullName: string, license: string): Element =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 24,
    },
    [
      el.card(
        {
          backgroundColor: theme.primarySoft,
          borderWidth: 0,
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
          maxWidth: "72px",
        },
        [
          el.text(abbr, {
            fontSize: 16,
            fontWeight: "800",
            color: theme.primary,
            letterSpacing: "0.04em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]
      ),
      el.text(fullName, {
        fontSize: 14,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 4,
        lineHeight: "1.4",
      }),
      el.text(license, {
        fontSize: 12,
        color: theme.textMuted,
        marginBottom: 0,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
    ]
  );

export const forexFuturesRegulatedTrustBar: Section = section(
  [
    singleColumnRow([
      el.text("GLOBALLY REGULATED", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.emerald,
        letterSpacing: "0.2em",
        marginBottom: 14,
      }),
      el.heading("Your funds, protected by tier-1 regulators", {
        textAlign: "center",
        fontSize: 42,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Client funds held in segregated accounts at tier-1 banks. Up to £85,000 FSCS coverage for eligible UK clients.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "660px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(25, [
          regulatorBadge(
            "FCA",
            "Financial Conduct Authority (UK)",
            "Lic. #748142"
          ),
        ]),
        col(25, [
          regulatorBadge(
            "CySEC",
            "Cyprus Securities & Exchange Commission",
            "Lic. #421/22"
          ),
        ]),
        col(25, [
          regulatorBadge(
            "ASIC",
            "Australian Securities & Investments Commission",
            "Lic. #512847"
          ),
        ]),
        col(25, [
          regulatorBadge(
            "FSA",
            "Financial Services Authority (Seychelles)",
            "Lic. #SD148"
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top" }
    ),
    row(
      [
        col(33.33, [
          el.card(
            {
              backgroundColor: theme.bgMuted,
              borderWidth: 0,
              borderRadius: 14,
              padding: 24,
            },
            [
              el.icon("lucide:shield-check", {
                size: 32,
                color: theme.emerald,
                marginBottom: 12,
              }),
              el.text("Segregated client funds", {
                fontSize: 15,
                fontWeight: "700",
                color: theme.text,
                marginBottom: 6,
              }),
              el.text(
                "Held at Barclays, HSBC, and DBS — never commingled with company operating capital.",
                { fontSize: 13, color: theme.textMuted, marginBottom: 0 }
              ),
            ]
          ),
        ]),
        col(33.33, [
          el.card(
            {
              backgroundColor: theme.bgMuted,
              borderWidth: 0,
              borderRadius: 14,
              padding: 24,
            },
            [
              el.icon("lucide:lock-keyhole", {
                size: 32,
                color: theme.sky,
                marginBottom: 12,
              }),
              el.text("Negative balance protection", {
                fontSize: 15,
                fontWeight: "700",
                color: theme.text,
                marginBottom: 6,
              }),
              el.text(
                "You can never lose more than your deposit, even during flash-crash liquidations.",
                { fontSize: 13, color: theme.textMuted, marginBottom: 0 }
              ),
            ]
          ),
        ]),
        col(33.33, [
          el.card(
            {
              backgroundColor: theme.bgMuted,
              borderWidth: 0,
              borderRadius: 14,
              padding: 24,
            },
            [
              el.icon("lucide:file-check-2", {
                size: 32,
                color: theme.violet,
                marginBottom: 12,
              }),
              el.text("Annual audits", {
                fontSize: 15,
                fontWeight: "700",
                color: theme.text,
                marginBottom: 6,
              }),
              el.text(
                "Add your own audit, certification and licensing details here.",
                { fontSize: 13, color: theme.textMuted, marginBottom: 0 }
              ),
            ]
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top", marginTop: 32 }
    ),
  ],
  {
    name: "Regulated Trust Bar",
    description: "Regulator badges and trust features (FCA, CySEC, ASIC, FSA)",
    category: "forex-futures",
    slug: "forex-futures-regulated-trust-bar",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
