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

const person = (
  image: string,
  name: string,
  role: string,
  bio: string
): Element[] => [
  el.image(image, `Headshot of ${name}`, {
    borderRadius: 200,
    width: "96px",
    height: "96px",
    marginBottom: 20,
  }),
  el.heading(name, {
    level: "h4",
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 4,
    letterSpacing: "-0.01em",
  }),
  el.text(role, {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primary,
    marginBottom: 12,
  }),
  el.text(bio, {
    fontSize: 13,
    lineHeight: "1.6",
    color: theme.textMuted,
    marginBottom: 20,
  }),
  el.link("LinkedIn →", "#", {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primary,
  }),
];

const personSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 16,
  padding: 28,
};

export const icoLaunchpadTeamAdvisors: Section = section(
  [
    singleColumnRow([
      el.text("TEAM & ADVISORS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.primary,
        marginBottom: 12,
      }),
      el.heading("Who's building Orbit Compute", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Real names, real LinkedIns, real track records. We don't do pseudonymous founders on launchpad-featured projects.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 44,
        }
      ),
      el.text("CORE TEAM", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        color: theme.textMuted,
        textAlign: "center",
        marginBottom: 32,
      }),
    ]),
    row(
      [
        col(
          25,
          person(
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
            "Arjun Patel",
            "Co-founder & CEO",
            "Ex-infra lead at Stripe. 10+ years scaling distributed systems."
          ),
          personSettings
        ),
        col(
          25,
          person(
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
            "Elena Rocha",
            "Co-founder & CTO",
            "Previously systems research at NVIDIA. Built GPU schedulers at scale."
          ),
          personSettings
        ),
        col(
          25,
          person(
            "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80",
            "Kenji Ito",
            "Head of Protocol",
            "Contributor to Ethereum client teams. Deep on consensus design."
          ),
          personSettings
        ),
        col(
          25,
          person(
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80",
            "Priya Shah",
            "Head of Growth",
            "Scaled two crypto products past $100M TVL. Miami-based."
          ),
          personSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 20, marginBottom: 40, verticalAlign: "top" }
    ),
    singleColumnRow([
      el.text("ADVISORS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        color: theme.textMuted,
        textAlign: "center",
        marginBottom: 32,
      }),
    ]),
    row(
      [
        col(
          33,
          person(
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
            "Marcus Wen",
            "Advisor — Infra",
            "Founding eng at Cloudflare Workers. Early angel in 14 crypto projects."
          ),
          personSettings
        ),
        col(
          33,
          person(
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
            "Naomi Cross",
            "Advisor — Economics",
            "Tokenomics designer for two top-30 projects. PhD monetary economics."
          ),
          personSettings
        ),
        col(
          34,
          person(
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
            "Sam Oduya",
            "Advisor — Legal",
            "Fintech counsel across 7 jurisdictions. Author, The DAO Handbook."
          ),
          personSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top" }
    ),
  ],
  {
    name: "Team & Advisors",
    description: "Core team grid plus advisor grid with LinkedIn links",
    category: "ico-launchpad",
    slug: "ico-launchpad-team-advisors",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
