import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

export const ecommerceBrandStoryProduct: Section = section(
  [
    row(
      [
        col(50, [
          el.text("OUR STORY", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.primary,
            letterSpacing: "0.22em",
            marginBottom: 18,
          }),
          el.heading("Made in small batches, built to last", {
            level: "h2",
            fontSize: 48,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.03em",
            lineHeight: "1.1",
          }),
          el.text(
            "We started in a studio in Porto with one idea — make everyday objects that earn their place in your life. Today, our pieces are cut, stitched, and packed by a team of 14 craftspeople across two workshops. No mass production. No shortcuts.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 20,
              lineHeight: "1.7",
            }
          ),
          el.text(
            "Every item carries a lifetime repair guarantee. Bring it back, we'll fix it — for the life of the product.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 32,
              lineHeight: "1.7",
            }
          ),
          el.button("Read the full story", "/about", {
            backgroundColor: theme.cssForeground,
            color: theme.cssBackground,
            marginRight: 12,
          }),
          el.button("Shop signature pieces", "/shop/signature", {
            backgroundColor: theme.cssSurface3,
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            marginRight: 0,
          }),
        ]),
        col(50, [
          el.image(
            "https://images.unsplash.com/photo-1556306535-38febf6782e7?w=1200&q=85",
            "Artisan hands stitching leather goods in a workshop",
            {
              borderRadius: 24,
              width: "100%",
              height: "auto",
              marginBottom: 16,
            }
          ),
          row(
            [
              col(50, [
                el.image(
                  "https://images.unsplash.com/photo-1568163297569-3fcb2b08f7ff?w=800&q=85",
                  "Close-up of leather texture and stitching",
                  {
                    borderRadius: 16,
                    width: "100%",
                    height: "auto",
                    marginBottom: 0,
                  }
                ),
              ]),
              col(50, [
                el.image(
                  "https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=800&q=85",
                  "Craftsman working on product detail",
                  {
                    borderRadius: 16,
                    width: "100%",
                    height: "auto",
                    marginBottom: 0,
                  }
                ),
              ]),
            ],
            { gutter: 16, maxWidth: "100%" }
          ) as any,
        ]),
      ],
      { ...rowPresets.wide, gutter: 48, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Brand Story Product",
    description: "Brand narrative on one side, product showcase collage on the other",
    category: "ecommerce",
    slug: "ecommerce-brand-story-product",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
