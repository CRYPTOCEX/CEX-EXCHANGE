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

type Product = {
  src: string;
  alt: string;
  name: string;
  price: string;
  tag?: string;
};

const products: Product[] = [
  {
    src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85",
    alt: "Red running sneakers on white background",
    name: "Aero Runner — Scarlet",
    price: "$129.00",
    tag: "New",
  },
  {
    src: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=900&q=85",
    alt: "Round tortoiseshell sunglasses",
    name: "Luna Sunglasses",
    price: "$89.00",
  },
  {
    src: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=900&q=85",
    alt: "Modern silver wristwatch with leather strap",
    name: "Chronos Field Watch",
    price: "$249.00",
    tag: "Bestseller",
  },
  {
    src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=85",
    alt: "Wireless over-ear headphones in matte black",
    name: "Hush Pro Headphones",
    price: "$199.00",
  },
];

const productCard = (p: Product) =>
  col(
    25,
    [
      el.image(p.src, p.alt, {
        borderRadius: 14,
        marginBottom: 16,
        width: "100%",
        height: "auto",
      }),
      ...(p.tag
        ? [
            el.text(p.tag.toUpperCase(), {
              fontSize: 10,
              fontWeight: "800",
              color: theme.primary,
              letterSpacing: "0.16em",
              marginBottom: 6,
            }),
          ]
        : []),
      el.heading(p.name, {
        level: "h3",
        fontSize: 16,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 6,
      }),
      el.text(p.price, {
        fontSize: 15,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 0,
      }),
    ]
  );

export const ecommerceProductGridHero: Section = section(
  [
    row(
      [
        col(60, [
          el.heading("New season, fresh essentials", {
            level: "h1",
            fontSize: 56,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 16,
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
          }),
          el.text(
            "Curated drops every Friday. Free shipping over $75, free returns anywhere.",
            {
              fontSize: 19,
              color: theme.textMuted,
              maxWidth: "520px",
              marginBottom: 28,
              lineHeight: "1.6",
            }
          ),
        ]),
        col(40, [
          el.button("Shop new in", "/shop/new", {
            backgroundColor: theme.cssPrimary,
            color: theme.cssPrimaryInk,
            marginRight: 12,
          }),
          el.button("View lookbook", "/shop/lookbook", {
            backgroundColor: theme.cssSurface3,
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            marginRight: 0,
          }),
        ], { textAlign: "right", verticalAlign: "bottom" }),
      ],
      { ...rowPresets.wide, gutter: 40, marginBottom: 48, verticalAlign: "bottom" }
    ),
    row([...products.map(productCard)], {
      ...rowPresets.wide,
      gutter: 24,
      verticalAlign: "top",
    }),
  ],
  {
    name: "Product Grid Hero",
    description: "Editorial hero with 4-column featured product grid",
    category: "ecommerce",
    slug: "ecommerce-product-grid-hero",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
