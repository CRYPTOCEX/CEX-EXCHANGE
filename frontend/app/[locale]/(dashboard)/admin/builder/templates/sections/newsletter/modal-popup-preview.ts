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

export const newsletterModalPopupPreview: Section = section(
  [
    singleColumnRow(
      [
        el.card(
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 20,
            paddingTop: 48,
            paddingBottom: 48,
            paddingLeft: 48,
            paddingRight: 48,
            maxWidth: "480px",
            marginLeft: "auto",
            marginRight: "auto",
            boxShadowX: 0,
            boxShadowY: 24,
            boxShadowBlur: 48,
            boxShadowColor: "rgba(10,18,32,0.14)",
            position: "relative",
          },
          [
            el.text("×", {
              fontSize: 24,
              fontWeight: "300",
              color: theme.textDim,
              position: "absolute",
              top: "16px",
              right: "20px",
              marginBottom: 0,
            }),
            el.icon("lucide:gift", {
              size: 34,
              color: theme.primary,
              backgroundColor: theme.primarySoft,
              borderRadius: 14,
              padding: 14,
              marginBottom: 20,
            }),
            el.heading("Get 10% off your first month", {
              level: "h3",
              fontSize: 26,
              fontWeight: "800",
              color: theme.text,
              marginBottom: 10,
              letterSpacing: "-0.02em",
              lineHeight: "1.2",
            }),
            el.text(
              "Subscribe to the newsletter and we'll send a discount code to your inbox within 60 seconds.",
              {
                fontSize: 15,
                lineHeight: "1.6",
                color: theme.textMuted,
                marginBottom: 24,
              }
            ),
            el.text("you@company.com", {
              fontSize: 15,
              color: theme.textDim,
              backgroundColor: theme.bgSubtle,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.border,
              borderRadius: 10,
              paddingTop: 13,
              paddingBottom: 13,
              paddingLeft: 16,
              paddingRight: 16,
              marginBottom: 12,
            }),
            el.button("Claim my discount", "#", {
              width: "100%",
              marginTop: 0,
              marginRight: 0,
              textAlign: "center",
            }),
            el.text("No thanks, I'll pay full price", {
              fontSize: 13,
              color: theme.textDim,
              textAlign: "center",
              marginTop: 14,
              marginBottom: 0,
              cursor: "pointer",
            }),
          ]
        ),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Modal Popup Preview",
    description: "Inline preview of a newsletter popup — card styled exactly as a modal would render",
    category: "newsletter",
    slug: "newsletter-modal-popup-preview",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgMuted,
    },
  }
);
