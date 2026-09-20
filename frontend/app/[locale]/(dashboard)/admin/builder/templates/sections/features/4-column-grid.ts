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

const tile = (
  icon: string,
  title: string,
  description: string,
  accent: string
) => [
  el.icon(icon, {
    size: 32,
    color: accent,
    marginBottom: 16,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 8,
    letterSpacing: "-0.005em",
  }),
  el.text(description, {
    fontSize: 14,
    lineHeight: "1.6",
    color: theme.textMuted,
    marginBottom: 0,
  }),
];

const tileSettings = {
  backgroundColor: theme.bgCard,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.border,
  borderRadius: 14,
  padding: 24,
};

export const features4ColumnGrid: Section = section(
  [
    singleColumnRow([
      el.heading("Built for every part of the stack", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 20,
        letterSpacing: "-0.025em",
        lineHeight: "1.1",
      }),
      el.text(
        "Eight tightly-integrated modules, one platform. Ship faster without gluing services together.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(25, tile("lucide:database", "Realtime DB", "Postgres-compatible with millisecond replicas.", theme.primary), tileSettings),
        col(25, tile("lucide:workflow", "Workflows", "Durable jobs with retry, backoff, and scheduling.", theme.emerald), tileSettings),
        col(25, tile("lucide:gauge", "Observability", "Traces, metrics, and logs unified in one pane.", theme.sky), tileSettings),
        col(25, tile("lucide:lock", "Secrets", "Encrypted vault with rotating tokens per environment.", theme.violet), tileSettings),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 24 }
    ),
    row(
      [
        col(25, tile("lucide:network", "Edge routing", "Global anycast with smart failover under 50ms.", theme.amber), tileSettings),
        col(25, tile("lucide:code-2", "CLI & SDKs", "First-class tools for TypeScript, Go, and Python.", theme.rose), tileSettings),
        col(25, tile("lucide:users", "Team access", "Role-based permissions, SSO, SCIM provisioning.", theme.primary), tileSettings),
        col(25, tile("lucide:cloud-lightning", "Cold-start < 40ms", "Containers spin up on demand at the edge.", theme.emerald), tileSettings),
      ],
      { ...rowPresets.wide, gutter: 24 }
    ),
  ],
  {
    name: "4-Column Feature Grid",
    description: "Compact grid of eight feature cards with icons and short copy",
    category: "features",
    slug: "features-4-column-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
