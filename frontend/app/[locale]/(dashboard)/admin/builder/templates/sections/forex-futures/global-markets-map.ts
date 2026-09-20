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

const sessionBadge = (name: string, status: "open" | "closed", hours: string) => {
  const isOpen = status === "open";
  return el.card(
    {
      /* `rgba(14,159,111,…)` IS the `--success` token: hsl(160 83.8% 33.9%)
         resolves to exactly rgb(14,159,111). Kept in rgba form because an
         element `backgroundColor`/`borderColor` needs a literal here — the
         `hsl(var(--success) / 0.15)` spelling contains a hyphen and would be
         routed to the class branch and dropped, and there is no
         `[hsl(var(--success)/0.15)]` fragment in `tailwindSafelist`. At 15%/35%
         alpha the wash reads correctly over both the light and the dark card. */
      backgroundColor: isOpen
        ? "rgba(14,159,111,0.15)"
        : theme.bgMuted,
      borderColor: isOpen
        ? "rgba(14,159,111,0.35)"
        : theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
    },
    [
      /* Raw HTML `style` attributes are real CSS, so the `css*` token forms
         work directly and follow the theme (the hyphen heuristic only applies
         to settings values the renderers post-process). */
      el.text(
        `<span style="display:inline-block;height:8px;width:8px;border-radius:999px;background:${isOpen ? theme.cssSuccess : theme.cssMutedInk};margin-right:8px;${isOpen ? "box-shadow:0 0 0 4px hsl(var(--success) / 0.20);animation:pulse 2s infinite;" : ""}"></span><strong style="color:${isOpen ? theme.cssSuccess : theme.cssMutedInk};letter-spacing:0.08em;font-size:11px;">${isOpen ? "OPEN" : "CLOSED"}</strong>`,
        { marginBottom: 8, fontSize: 11 }
      ),
      el.text(name, {
        fontSize: 16,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 4,
      }),
      el.text(hours, {
        fontSize: 12,
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );
};

export const forexFuturesGlobalMarketsMap: Section = section(
  [
    singleColumnRow([
      el.text("GLOBAL MARKETS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Trade every session, from every timezone", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Forex liquidity rotates around the globe every 24 hours. Follow the overlap windows for the tightest spreads.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 48,
        }
      ),
    ]),
    singleColumnRow(
      [
        el.image(
          "https://images.unsplash.com/photo-1589519160732-57fc498494f8?w=2000&q=85",
          "Dotted world map showing global forex session coverage",
          {
            borderRadius: 20,
            maxWidth: "1080px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            marginBottom: 32,
          }
        ),
      ],
      { ...rowPresets.wide, textAlign: "center" }
    ),
    row(
      [
        col(25, [sessionBadge("Sydney", "closed", "Opens in 3h 12m")]),
        col(25, [sessionBadge("Tokyo", "open", "Closes in 6h 48m")]),
        col(25, [sessionBadge("London", "open", "Closes in 4h 22m")]),
        col(25, [sessionBadge("New York", "closed", "Opens in 1h 18m")]),
      ],
      { ...rowPresets.wide, gutter: 16, verticalAlign: "top" }
    ),
    singleColumnRow(
      [
        el.text(
          "<strong>Peak liquidity:</strong> London–New York overlap, 13:00–17:00 UTC. Tightest spreads on EUR/USD, GBP/USD, USD/JPY.",
          {
            fontSize: 14,
            color: theme.textMuted,
            textAlign: "center",
            marginTop: 32,
            marginBottom: 0,
          }
        ),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Global Markets Map",
    description: "World map with forex session overlay indicators",
    category: "forex-futures",
    slug: "forex-futures-global-markets-map",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
