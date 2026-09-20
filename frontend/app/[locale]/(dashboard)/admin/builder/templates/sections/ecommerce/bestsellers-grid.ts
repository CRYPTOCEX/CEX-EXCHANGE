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

type Best = {
  src: string;
  alt: string;
  name: string;
  price: string;
  rating: string;
  reviews: string;
};

const bestsellers: Best[] = [
  {
    src: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=900&q=85",
    alt: "White athletic sneakers on pale background",
    name: "Arc Runner Sneaker",
    price: "$148.00",
    rating: "4.9",
    reviews: "2,418",
  },
  {
    src: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=900&q=85",
    alt: "Matte black wireless earbuds",
    name: "Pulse Wireless Earbuds",
    price: "$129.00",
    rating: "4.8",
    reviews: "1,872",
  },
  {
    src: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=900&q=85",
    alt: "Minimalist black backpack",
    name: "Roam Backpack 22L",
    price: "$168.00",
    rating: "4.9",
    reviews: "1,204",
  },
  {
    src: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=900&q=85",
    alt: "Stainless steel water bottle on stone surface",
    name: "Keep Insulated Bottle",
    price: "$42.00",
    rating: "4.9",
    reviews: "3,812",
  },
];

const bestCard = (b: Best) =>
  col(
    25,
    [
      col(100, [
        el.text("BESTSELLER", {
          fontSize: 10,
          fontWeight: "800",
          color: theme.onBand,
          letterSpacing: "0.16em",
          marginBottom: 0,
          backgroundColor: theme.rose,
          borderRadius: 999,
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 12,
          paddingRight: 12,
          textAlign: "center",
          display: "inline-block",
        }),
      ], { position: "absolute", top: "12px", left: "12px", zIndex: "2" }) as any,
      el.image(b.src, b.alt, {
        borderRadius: 14,
        width: "100%",
        height: "auto",
        marginBottom: 16,
      }),
      el.heading(b.name, {
        level: "h3",
        fontSize: 16,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 6,
      }),
      el.text(`★ ${b.rating} · ${b.reviews} reviews`, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 8,
      }),
      el.text(b.price, {
        fontSize: 15,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 0,
      }),
    ],
    { position: "relative" }
  );

export const ecommerceBestsellersGrid: Section = section(
  [
    singleColumnRow([
      el.text("LOVED BY CUSTOMERS", {
        fontSize: 12,
        fontWeight: "800",
        textAlign: "center",
        color: theme.rose,
        letterSpacing: "0.22em",
        marginBottom: 16,
      }),
      el.heading("This month's bestsellers", {
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
        "The items flying off our shelves — ranked by 30-day units sold and 5-star reviews.",
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
    row(bestsellers.map(bestCard), {
      ...rowPresets.wide,
      gutter: 24,
      verticalAlign: "top",
    }),
  ],
  {
    name: "Bestsellers Grid",
    description: "4-product grid with bestseller badges, star ratings, review counts",
    category: "ecommerce",
    slug: "ecommerce-bestsellers-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
