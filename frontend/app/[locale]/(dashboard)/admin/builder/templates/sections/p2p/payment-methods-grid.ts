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

const methodTile = (
  icon: string,
  name: string,
  detail: string,
  accent: string
) =>
  col(
    100,
    [
      el.icon(icon, { size: 28, color: accent, marginBottom: 14 }),
      el.heading(name, {
        level: "h3",
        fontSize: 15,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 4,
      }),
      el.text(detail, {
        fontSize: 12,
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ],
    {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 14,
      paddingTop: 22,
      paddingBottom: 22,
      paddingLeft: 20,
      paddingRight: 20,
    }
  );

export const p2pPaymentMethodsGrid: Section = section(
  [
    singleColumnRow([
      el.text("PAYMENT METHODS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Pay how you want, wherever you are", {
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
        "100+ supported payment rails across fiat and digital wallets. Pick the one you trust most.",
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
    row(
      [
        methodTile("lucide:landmark", "Bank transfer", "SWIFT · ACH · Faster Payments", theme.primary),
        methodTile("lucide:wallet", "PayPal", "Buyer-protected", theme.sky),
        methodTile("lucide:credit-card", "Revolut", "Instant EU transfers", theme.violet),
        methodTile("lucide:send", "Wise", "Multi-currency", theme.emerald),
      ],
      { ...rowPresets.wide, gutter: 16, marginBottom: 16 }
    ),
    row(
      [
        methodTile("lucide:banknote", "SEPA Instant", "Europe · 10 seconds", theme.amber),
        methodTile("lucide:smartphone", "Cash App", "US · instant", theme.emerald),
        methodTile("lucide:building-2", "Zelle", "US banks", theme.sky),
        methodTile("lucide:globe", "Payoneer", "150+ currencies", theme.primary),
      ],
      { ...rowPresets.wide, gutter: 16, marginBottom: 16 }
    ),
    row(
      [
        methodTile("lucide:smartphone-charging", "M-Pesa", "Kenya · Tanzania", theme.rose),
        methodTile("lucide:credit-card", "UPI", "India · instant", theme.violet),
        methodTile("lucide:landmark", "GCash", "Philippines", theme.sky),
        methodTile("lucide:gift", "Gift cards", "Amazon · Apple · Steam", theme.amber),
      ],
      { ...rowPresets.wide, gutter: 16 }
    ),
  ],
  {
    name: "Payment Methods Grid",
    description: "12-tile payment methods grid spanning fiat rails and mobile wallets",
    category: "p2p",
    slug: "p2p-payment-methods-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
