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

type Review = {
  name: string;
  title: string;
  body: string;
  product: string;
};

const reviews: Review[] = [
  {
    name: "Morgan L.",
    title: "Worth every penny",
    body: "I've worn these sneakers daily for three months — no break-in, no rubbing, they still look new. Packaging was beautiful too.",
    product: "Arc Runner Sneaker",
  },
  {
    name: "Priya S.",
    title: "The mug I use every morning",
    body: "Keeps coffee warm longer than my old ceramic. Heavy enough to feel premium but light enough to hold comfortably. Got one for my sister.",
    product: "Clay Everyday Mug",
  },
  {
    name: "Daniel K.",
    title: "Great commuter bag",
    body: "Survived a weekend soaked in rain without a drop getting in. Laptop sleeve is padded and the zippers feel solid. Easy 5 stars.",
    product: "Roam Backpack 22L",
  },
  {
    name: "Aisha R.",
    title: "Finally a watch that lasts",
    body: "Lightweight on the wrist, and the strap softened up in a week. Returns were easy when I swapped sizes. Customer service was patient.",
    product: "Meridian Watch",
  },
  {
    name: "Tomás V.",
    title: "Sound quality surprised me",
    body: "Bought these for the commute — they beat my $400 set. Noise cancellation is honestly shocking for the price.",
    product: "Hush Pro Headphones",
  },
  {
    name: "Leila J.",
    title: "My new weekend uniform",
    body: "The fabric is so soft and the fit is perfect — not oversized, not tight. Ordered in three colors after the first wash convinced me.",
    product: "Weekend Tee",
  },
];

const reviewCard = (r: Review) =>
  col(
    100,
    [
      el.text("★★★★★", {
        fontSize: 16,
        color: theme.amber,
        marginBottom: 14,
        letterSpacing: "0.08em",
      }),
      el.heading(r.title, {
        level: "h4",
        fontSize: 17,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 10,
      }),
      el.text(r.body, {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: "1.65",
        marginBottom: 18,
      }),
      el.divider({ marginTop: 0, marginBottom: 16 }),
      row(
        [
          col(60, [
            el.text(r.name, {
              fontSize: 14,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 2,
            }),
            el.text(r.product, {
              fontSize: 12,
              color: theme.textMuted,
              marginBottom: 0,
            }),
          ]),
          col(
            40,
            [
              el.text("✓ Verified buyer", {
                fontSize: 11,
                color: theme.emerald,
                fontWeight: "600",
                marginBottom: 0,
              }),
            ],
            { textAlign: "right" }
          ),
        ],
        { gutter: 8, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, verticalAlign: "middle" }
      ) as any,
    ],
    {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 16,
      paddingTop: 28,
      paddingBottom: 28,
      paddingLeft: 24,
      paddingRight: 24,
    }
  );

export const ecommerceCustomerReviewsGrid: Section = section(
  [
    singleColumnRow([
      el.text("4.9 / 5 · 28,412 REVIEWS", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.amber,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Loved by real customers", {
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
        "A snapshot of verified reviews pulled straight from the last 30 days.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [reviews[0], reviews[1], reviews[2]].map(reviewCard),
      { ...rowPresets.wide, gutter: 24, marginBottom: 24, verticalAlign: "top" }
    ),
    row(
      [reviews[3], reviews[4], reviews[5]].map(reviewCard),
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Customer Reviews Grid",
    description: "6 verified-buyer reviews with star ratings and product context",
    category: "ecommerce",
    slug: "ecommerce-customer-reviews-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
