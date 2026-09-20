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

type Story = {
  avatar: string;
  alt: string;
  name: string;
  role: string;
  quote: string;
  earned: string;
  months: string;
};

const stories: Story[] = [
  {
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=85",
    alt: "Portrait of a smiling woman in creator studio",
    name: "Sofia Marchetti",
    role: "YouTube creator · @MashWithSofia",
    quote:
      "I replaced my ad-read income in two months. My audience already trusted me — plugging in our link was the easiest decision I've made.",
    earned: "$52,400",
    months: "first 6 months",
  },
  {
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=85",
    alt: "Portrait of a young man at a desk with monitors",
    name: "Marcus Adebayo",
    role: "Newsletter writer · Altcoin Digest",
    quote:
      "90-day cookies mean I still earn from readers who click now and deposit weeks later. The attribution is genuinely the best I've seen.",
    earned: "$38,900",
    months: "first 4 months",
  },
  {
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=85",
    alt: "Portrait of a woman with headphones in podcast studio",
    name: "Ayesha Khan",
    role: "Podcast host · On-Chain with Ayesha",
    quote:
      "The creator team built custom UTM landers for each episode. Small touches like that push conversion from 'fine' to excellent.",
    earned: "$27,100",
    months: "first 3 months",
  },
];

const storyCard = (s: Story) =>
  col(
    100,
    [
      row(
        [
          col(
            30,
            [
              el.image(s.avatar, s.alt, {
                borderRadius: 999,
                width: "72px",
                height: "72px",
                marginBottom: 0,
              }),
            ],
            { width: "72px", maxWidth: "72px", paddingLeft: 0, paddingRight: 0 }
          ),
          col(70, [
            el.heading(s.name, {
              level: "h4",
              fontSize: 17,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 4,
            }),
            el.text(s.role, {
              fontSize: 13,
              color: theme.textMuted,
              marginBottom: 0,
            }),
          ], { paddingLeft: 16 }),
        ],
        { gutter: 0, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 24, verticalAlign: "middle" }
      ) as any,
      el.quote(`"${s.quote}"`, s.name, {
        fontSize: 17,
        color: theme.text,
        lineHeight: "1.6",
        fontWeight: "500",
        marginBottom: 24,
      }),
      el.divider({ marginTop: 0, marginBottom: 20 }),
      el.text("EARNED", {
        fontSize: 10,
        fontWeight: "800",
        color: theme.textDim,
        letterSpacing: "0.18em",
        marginBottom: 8,
      }),
      el.heading(s.earned, {
        level: "h3",
        fontSize: 34,
        fontWeight: "800",
        color: theme.emerald,
        letterSpacing: "-0.02em",
        marginBottom: 4,
      }),
      el.text(s.months, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ],
    {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 20,
      paddingTop: 32,
      paddingBottom: 32,
      paddingLeft: 28,
      paddingRight: 28,
    }
  );

export const affiliateSuccessStories: Section = section(
  [
    singleColumnRow([
      el.text("SUCCESS STORIES", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.primary,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Real creators, real numbers", {
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
        "Three affiliates who let us share their numbers. Hundreds more are earning quietly — and those are just the top 10%.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(stories.map(storyCard), {
      ...rowPresets.wide,
      gutter: 24,
      verticalAlign: "top",
    }),
  ],
  {
    name: "Affiliate Success Stories",
    description: "3 creator success stories with avatar, quote, and earnings",
    category: "affiliate",
    slug: "affiliate-success-stories",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
