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

const gramTile = (src: string, alt: string) =>
  col(100, [
    el.image(src, alt, {
      borderRadius: 12,
      width: "100%",
      height: "auto",
      marginBottom: 0,
    }),
  ]);

export const ecommerceShopInstagramFeed: Section = section(
  [
    singleColumnRow([
      el.text("@OUR.SHOP ON INSTAGRAM", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.primary,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Styled by our community", {
        level: "h2",
        fontSize: 42,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.025em",
        lineHeight: "1.1",
      }),
      el.text(
        "Tag #OurShop to be featured. Tap any photo to shop the look.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        gramTile(
          "https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&q=85",
          "Flat-lay of neutral-toned fashion accessories"
        ),
        gramTile(
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=85",
          "Model wearing minimal knitwear outdoors"
        ),
        gramTile(
          "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=85",
          "Woman in denim jacket carrying tote bag"
        ),
        gramTile(
          "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800&q=85",
          "Colorful shoes arranged on steps"
        ),
        gramTile(
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=85",
          "Coffee table styled with books and ceramic mug"
        ),
        gramTile(
          "https://images.unsplash.com/photo-1519415387722-a1c3bbef716c?w=800&q=85",
          "Person holding leather bag on a city street"
        ),
      ],
      { ...rowPresets.wide, gutter: 14, verticalAlign: "top" }
    ),
    singleColumnRow(
      [
        el.button("Follow us on Instagram", "https://instagram.com", {
          backgroundColor: theme.cssForeground,
          color: theme.cssBackground,
          marginTop: 40,
          marginRight: 0,
        }),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Shop Instagram Feed",
    description: "6-tile instagram-style photo grid with follow CTA",
    category: "ecommerce",
    slug: "ecommerce-shop-instagram-feed",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
