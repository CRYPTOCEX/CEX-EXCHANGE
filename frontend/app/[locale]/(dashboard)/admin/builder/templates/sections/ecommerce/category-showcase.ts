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

const categoryTile = (
  src: string,
  alt: string,
  label: string,
  count: string
) =>
  col(
    100,
    [
      el.image(src, alt, {
        borderRadius: 16,
        width: "100%",
        height: "auto",
        marginBottom: 16,
      }),
      el.heading(label, {
        level: "h3",
        fontSize: 20,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 4,
      }),
      el.text(count, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const ecommerceCategoryShowcase: Section = section(
  [
    singleColumnRow([
      el.heading("Shop by category", {
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
        "From wardrobe essentials to weekend gear — find exactly what you're looking for.",
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
      [
        categoryTile(
          "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=900&q=85",
          "Fashion apparel on hangers",
          "Clothing",
          "1,240 items"
        ),
        categoryTile(
          "https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=900&q=85",
          "Stack of leather shoes",
          "Footwear",
          "384 items"
        ),
        categoryTile(
          "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=900&q=85",
          "Modern tech gadgets and accessories",
          "Electronics",
          "612 items"
        ),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 24 }
    ),
    row(
      [
        categoryTile(
          "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=900&q=85",
          "Minimal home decor and ceramics",
          "Home & Decor",
          "508 items"
        ),
        categoryTile(
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=85",
          "Skincare and beauty products on pastel background",
          "Beauty",
          "276 items"
        ),
        categoryTile(
          "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900&q=85",
          "Outdoor sports gear and running equipment",
          "Sport & Outdoor",
          "192 items"
        ),
      ],
      { ...rowPresets.wide, gutter: 24 }
    ),
  ],
  {
    name: "Category Showcase",
    description: "6 category tiles with imagery and item counts",
    category: "ecommerce",
    slug: "ecommerce-category-showcase",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
