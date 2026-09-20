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

const photo = (src: string, alt: string, height = "240px") =>
  el.image(src, alt, {
    width: "100%",
    height,
    objectFit: "cover",
    borderRadius: 16,
    marginBottom: 0,
  });

export const aboutPhotoGalleryStory: Section = section(
  [
    row(
      [
        col(45, [
          el.text("LIFE AT THE COMPANY", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.14em",
            marginBottom: 16,
          }),
          el.heading("Seven years. Forty-two countries. One shared obsession with execution speed.", {
            fontSize: 42,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.15",
            marginBottom: 24,
          }),
          el.text(
            "We are a remote-first team with hubs in Singapore, Zurich, and Brooklyn. We meet in person three times a year in a different city and argue about book depth over dinner.",
            { fontSize: 18, marginBottom: 20 }
          ),
          el.text(
            "The photos on the right are from our last on-site in Lisbon. Somebody brought a whiteboard to the beach. It was not us. But we contributed.",
            { fontSize: 18, marginBottom: 32 }
          ),
          el.button("See open roles", "/careers", { fontSize: 16 }),
        ]),
        col(55, [
          row(
            [
              col(50, [
                photo(
                  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
                  "Team collaborating around a whiteboard during our annual retreat",
                  "260px"
                ),
              ]),
              col(50, [
                photo(
                  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
                  "Engineers reviewing dashboards in our Zurich office",
                  "260px"
                ),
              ]),
            ],
            { gutter: 16, paddingTop: 0, paddingBottom: 16, maxWidth: "100%" }
          ),
          row(
            [
              col(50, [
                photo(
                  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80",
                  "Founder and engineer pairing at a laptop",
                  "220px"
                ),
              ]),
              col(50, [
                photo(
                  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80",
                  "The team at our Lisbon offsite dinner",
                  "220px"
                ),
              ]),
            ],
            { gutter: 16, paddingTop: 0, paddingBottom: 0, maxWidth: "100%" }
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 48 }
    ),
  ],
  {
    name: "Photo Gallery Story",
    description: "Copy with a 4-photo mosaic",
    category: "about",
    slug: "about-photo-gallery-story",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
