import type { Section } from "@/types/builder";
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

const regionCard = (
  flag: string,
  region: string,
  countries: string,
  currency: string
) =>
  col(
    100,
    [
      el.text(flag, {
        fontSize: 28,
        marginBottom: 10,
      }),
      el.heading(region, {
        level: "h4",
        fontSize: 15,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 6,
      }),
      el.text(countries, {
        fontSize: 12,
        color: theme.textMuted,
        marginBottom: 6,
      }),
      el.text(currency, {
        fontSize: 11,
        color: theme.emerald,
        fontWeight: "600",
        marginBottom: 0,
      }),
    ],
    {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 12,
      paddingTop: 18,
      paddingBottom: 18,
      paddingLeft: 16,
      paddingRight: 16,
    }
  );

export const p2pRegionCoverageMap: Section = section(
  [
    singleColumnRow([
      el.text("GLOBAL COVERAGE", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.sky,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Trading in 190+ countries", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.025em",
        lineHeight: "1.1",
      }),
      el.text(
        "Wherever you are, local payment rails and local currency pairs are one tap away.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    singleColumnRow(
      [
        el.image(
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=2000&q=85",
          "World map showing global P2P trading coverage",
          {
            borderRadius: 20,
            maxWidth: "1100px",
            marginBottom: 40,
            opacity: 0.9,
          }
        ),
      ],
      { textAlign: "center" }
    ),
    row(
      [
        regionCard("🇺🇸", "North America", "US, Canada, Mexico", "USD · CAD · MXN"),
        regionCard("🇬🇧", "Europe", "UK, EU, Switzerland, Norway", "EUR · GBP · CHF"),
        regionCard("🇳🇬", "Africa", "Nigeria, Kenya, Ghana, SA", "NGN · KES · ZAR"),
        regionCard("🇮🇳", "South Asia", "India, Pakistan, Bangladesh", "INR · PKR · BDT"),
      ],
      { ...rowPresets.wide, gutter: 16, marginBottom: 16 }
    ),
    row(
      [
        regionCard("🇵🇭", "Southeast Asia", "Philippines, Vietnam, Thailand", "PHP · VND · THB"),
        regionCard("🇧🇷", "Latin America", "Brazil, Argentina, Colombia", "BRL · ARS · COP"),
        regionCard("🇦🇪", "Middle East", "UAE, Saudi Arabia, Turkey", "AED · SAR · TRY"),
        regionCard("🇦🇺", "Oceania", "Australia, New Zealand", "AUD · NZD"),
      ],
      { ...rowPresets.wide, gutter: 16 }
    ),
  ],
  {
    name: "Region Coverage Map",
    description: "World map + regional coverage grid with local currencies",
    category: "p2p",
    slug: "p2p-region-coverage-map",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
