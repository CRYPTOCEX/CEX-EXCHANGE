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

const saleCard = (
  image: string,
  project: string,
  industry: string,
  token: string,
  goal: string,
  start: string
): Element[] => [
  el.image(image, `${project} project banner`, {
    borderRadius: 14,
    marginBottom: 20,
    height: "160px",
    width: "100%",
  }),
  el.text(
    `<span style="display:inline-block;width:70%;vertical-align:middle"><span style="display:block;font-size:18px;font-weight:700;color:currentColor;letter-spacing:-0.01em;margin-bottom:4px">${project}</span><span style="display:block;font-size:12px;opacity:0.7">${industry}</span></span><span style="display:inline-block;width:30%;vertical-align:middle;text-align:right"><span style="display:inline-block;font-size:12px;font-weight:700;color:#6366f1;background:rgba(99,102,241,0.12);border-radius:999px;padding:4px 10px">${token}</span></span>`,
    {
      fontSize: 14,
      color: theme.text,
      marginBottom: 20,
      lineHeight: "1.5",
    }
  ),
  el.divider({ marginTop: 0, marginBottom: 16, borderColor: theme.border }),
  el.text(
    `<span style="display:inline-block;width:50%"><span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.14em;opacity:0.7;margin-bottom:4px">RAISE GOAL</span><span style="display:block;font-size:14px;font-weight:700">${goal}</span></span><span style="display:inline-block;width:50%"><span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.14em;opacity:0.7;margin-bottom:4px">STARTS</span><span style="display:block;font-size:14px;font-weight:700">${start}</span></span>`,
    {
      fontSize: 14,
      color: theme.text,
      marginBottom: 20,
      lineHeight: "1.5",
    }
  ),
  el.button("View sale", `/launchpad/${token.toLowerCase()}`, {
    fontSize: 14,
    width: "100%",
    textAlign: "center",
    marginTop: 0,
    marginRight: 0,
  }),
];

const cardSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 18,
  padding: 20,
};

export const icoLaunchpadUpcomingSalesGrid: Section = section(
  [
    singleColumnRow([
      el.text("LAUNCHPAD", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.primary,
        marginBottom: 12,
      }),
      el.heading("Upcoming token sales", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Curated projects launching over the next 30 days. KYC-screened teams and independently-audited contracts.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(
          33,
          saleCard(
            "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
            "Orbit Compute",
            "Decentralised GPU",
            "ORBT",
            "$4.5M",
            "May 06"
          ),
          cardSettings
        ),
        col(
          33,
          saleCard(
            "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",
            "Halo Identity",
            "Web3 identity",
            "HALO",
            "$2.8M",
            "May 12"
          ),
          cardSettings
        ),
        col(
          34,
          saleCard(
            "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
            "Meridian DeFi",
            "Fixed-income yield",
            "MRDN",
            "$8.0M",
            "May 18"
          ),
          cardSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 24, verticalAlign: "top" }
    ),
    row(
      [
        col(
          33,
          saleCard(
            "https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=800&q=80",
            "Aperture RWA",
            "Real-world assets",
            "APRT",
            "$6.2M",
            "May 22"
          ),
          cardSettings
        ),
        col(
          33,
          saleCard(
            "https://images.unsplash.com/photo-1644088379091-d574269d422f?w=800&q=80",
            "Parallel Gaming",
            "On-chain gaming",
            "PRLL",
            "$3.4M",
            "Jun 03"
          ),
          cardSettings
        ),
        col(
          34,
          saleCard(
            "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=800&q=80",
            "Kinetic Supply",
            "Supply-chain oracles",
            "KNTC",
            "$5.1M",
            "Jun 10"
          ),
          cardSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Upcoming Sales Grid",
    description: "Six upcoming ICO cards with start date, raise goal, and token ticker",
    category: "ico-launchpad",
    slug: "ico-launchpad-upcoming-sales-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
