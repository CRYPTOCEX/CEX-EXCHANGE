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

/* The caption under each chip is DISPLAY COPY, so it has to say something a
   reader can act on. It used to print an old-palette hex ("#6366F1") while the
   chip beside it was already painted from `theme.primary` — i.e. the caption
   named a colour the section no longer used. The captions now name the token
   that actually paints the chip, which is also what the body copy above them
   promises ("Brand color tokens + accessible pairings"). */
const colorSwatch = (name: string, token: string, bg: string) =>
  col(
    100,
    [
      col(
        100,
        [el.text("", { marginBottom: 0 })],
        {
          backgroundColor: bg,
          borderRadius: 10,
          height: "72px",
          marginBottom: 10,
        }
      ) as any,
      el.text(name, {
        fontSize: 13,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 2,
      }),
      el.text(token, {
        fontSize: 11,
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const affiliateBrandGuidelines: Section = section(
  [
    row(
      [
        col(50, [
          el.text("BRAND GUIDELINES", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.primary,
            letterSpacing: "0.22em",
            marginBottom: 18,
          }),
          el.heading("Keep it on-brand, keep it converting", {
            level: "h2",
            fontSize: 42,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
          }),
          el.text(
            "The full brand book — logo usage, color tokens, type scale, do's and don'ts. Download the PDF, the asset library, or just grab SVGs on the fly.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 28,
              lineHeight: "1.65",
            }
          ),
          el.list(
            [
              "Logo variations (SVG, PNG, light/dark)",
              "Brand color tokens + accessible pairings",
              "Type scale & web font licenses",
              "Approved messaging & disclaimers",
            ],
            {
              fontSize: 15,
              color: theme.text,
              marginBottom: 32,
              listStyle: "check",
            }
          ),
          el.button("Download brand kit (ZIP)", "/affiliate/brand-kit.zip", {
            backgroundColor: theme.cssPrimary,
            color: theme.cssPrimaryInk,
            marginRight: 12,
          }),
          el.button("View guidelines", "/affiliate/brand-guidelines", {
            backgroundColor: theme.cssSurface3,
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            marginRight: 0,
          }),
        ]),
        col(
          50,
          [
            el.heading("Mash", {
              level: "h3",
              fontSize: 64,
              fontWeight: "800",
              color: theme.text,
              textAlign: "center",
              letterSpacing: "-0.04em",
              marginBottom: 8,
            }),
            el.text("Primary wordmark", {
              fontSize: 12,
              color: theme.textDim,
              textAlign: "center",
              letterSpacing: "0.12em",
              marginBottom: 32,
            }),
            el.divider({ marginTop: 0, marginBottom: 24 }),
            el.text("CORE PALETTE", {
              fontSize: 11,
              fontWeight: "800",
              color: theme.textDim,
              letterSpacing: "0.18em",
              marginBottom: 16,
            }),
            row(
              [
                colorSwatch("Primary", "--primary", theme.primary),
                colorSwatch("Success", "--success", theme.emerald),
                colorSwatch("Warning", "--warning", theme.amber),
                colorSwatch("Info", "--info", theme.sky),
              ],
              { gutter: 12, maxWidth: "100%", paddingTop: 0, paddingBottom: 0 }
            ) as any,
          ],
          {
            backgroundColor: theme.bgCard,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            borderRadius: 20,
            paddingTop: 40,
            paddingBottom: 40,
            paddingLeft: 32,
            paddingRight: 32,
          }
        ),
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Brand Guidelines",
    description: "Brand preview with logo, color palette, and download CTA",
    category: "affiliate",
    slug: "affiliate-brand-guidelines",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
