import type { Section, Element } from "@/types/builder";
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

const kycStep = (
  number: string,
  icon: string,
  title: string,
  body: string,
  time: string
): Element[] => [
  el.text(number, {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.18em",
    color: theme.primary,
    marginBottom: 16,
  }),
  el.icon(icon, {
    size: 36,
    color: theme.primary,
    marginBottom: 24,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 12,
    letterSpacing: "-0.01em",
  }),
  el.text(body, {
    fontSize: 14,
    lineHeight: "1.65",
    color: theme.textMuted,
    marginBottom: 20,
  }),
  el.text(time, {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.14em",
    color: theme.emerald,
    backgroundColor: theme.bgMuted,
    borderRadius: 999,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 12,
    maxWidth: "140px",
    textAlign: "center",
    marginBottom: 0,
  }),
];

const kycStepSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 18,
  padding: 32,
};

export const icoLaunchpadKycProcessSteps: Section = section(
  [
    singleColumnRow([
      el.text("COMPLIANCE", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.primary,
        marginBottom: 12,
      }),
      el.heading("KYC in three steps", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Partner-powered KYC (Sumsub). Your data is encrypted at rest and never leaves the compliance vault.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(
          33,
          kycStep(
            "STEP 01",
            "lucide:file-text",
            "Submit documents",
            "Upload a government-issued ID and a proof of address. Mobile-friendly, no email back-and-forth.",
            "~ 2 MINUTES"
          ),
          kycStepSettings
        ),
        col(
          33,
          kycStep(
            "STEP 02",
            "lucide:scan-face",
            "Verify liveness",
            "Quick selfie check confirms you match the ID. Anti-spoofing runs automatically.",
            "~ 1 MINUTE"
          ),
          kycStepSettings
        ),
        col(
          34,
          kycStep(
            "STEP 03",
            "lucide:shield-check",
            "Get approved",
            "Most profiles clear within 15 minutes. You'll get an email the moment your status flips to Approved.",
            "~ 15 MIN AVG"
          ),
          kycStepSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "KYC Process Steps",
    description: "Three-step KYC onboarding flow — submit, verify, approved",
    category: "ico-launchpad",
    slug: "ico-launchpad-kyc-process-steps",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
