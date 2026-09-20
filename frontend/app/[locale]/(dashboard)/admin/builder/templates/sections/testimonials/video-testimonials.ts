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
import type { Element } from "@/types/builder";

const videoCard = (
  thumb: string,
  alt: string,
  name: string,
  role: string,
  blurb: string,
  duration: string,
): Element =>
  el.card(
    {
      padding: 0,
      borderRadius: 20,
      overflow: "hidden",
      borderWidth: 1,
    },
    [
      el.image(thumb, alt, {
        width: "100%",
        height: "220px",
        borderRadius: 0,
        objectFit: "cover",
      }),
      el.icon("Play", {
        size: 56,
        color: theme.onBand,
        backgroundColor: theme.overlay,
        borderRadius: 999,
        position: "absolute",
        top: "88px",
        left: "calc(50% - 28px)",
        padding: 16,
        marginBottom: 0,
      }),
      el.text(duration, {
        fontSize: 12,
        fontWeight: "600",
        color: theme.onBand,
        backgroundColor: theme.overlay,
        borderRadius: 6,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 8,
        paddingRight: 8,
        position: "absolute",
        top: "16px",
        right: "16px",
        marginBottom: 0,
      }),
      el.text(blurb, {
        fontSize: 16,
        fontWeight: "500",
        color: theme.text,
        marginBottom: 16,
        paddingTop: 24,
        paddingLeft: 24,
        paddingRight: 24,
      }),
      el.text(name, {
        fontSize: 14,
        fontWeight: "600",
        color: theme.text,
        paddingLeft: 24,
        paddingRight: 24,
        marginBottom: 2,
      }),
      el.text(role, {
        fontSize: 13,
        color: theme.textMuted,
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: 24,
        marginBottom: 0,
      }),
    ]
  );

export const testimonialsVideoTestimonials: Section = section(
  [
    singleColumnRow([
      el.text("CUSTOMER FILMS", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Hear it from the desk", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Two-minute stories from traders about how they built their edge with our platform.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 48,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          videoCard(
            "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80",
            "Trader Sara Lin on camera at her desk",
            "Sara Lin",
            "Senior Trader, Meridian Capital",
            "“Execution that finally matches the speed of our decisions.”",
            "2:14",
          ),
        ]),
        col(33.33, [
          videoCard(
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80",
            "Marcus Okafor speaks about trading",
            "Marcus Okafor",
            "Head of Execution, Northgate",
            "“We moved 40% of our flow and never looked back.”",
            "3:02",
          ),
        ]),
        col(33.33, [
          videoCard(
            "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=800&q=80",
            "Priya Desai in studio interview",
            "Priya Desai",
            "Quant Lead, Helix Strategies",
            "“The backtester rewrote how our research team works.”",
            "1:48",
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Video Testimonials",
    description: "Three video-thumbnail cards with play-icon overlays",
    category: "testimonials",
    slug: "testimonials-video-testimonials",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
