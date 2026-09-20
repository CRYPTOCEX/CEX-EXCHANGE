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

const slotCard = (day: string, date: string, slots: string[]) =>
  el.card(
    {
      padding: 24,
      borderRadius: 16,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      textAlign: "center",
    },
    [
      el.text(day, {
        fontSize: 13,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.14em",
        textAlign: "center",
        marginBottom: 6,
      }),
      el.heading(date, {
        fontSize: 32,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.02em",
        marginBottom: 20,
        color: theme.text,
      }),
      ...slots.map((slot, i) =>
        el.card(
          {
            padding: 12,
            borderRadius: 10,
            backgroundColor: theme.bgMuted,
            borderWidth: 0,
            marginBottom: i === slots.length - 1 ? 0 : 10,
            textAlign: "center",
          },
          [
            el.text(slot, {
              fontSize: 15,
              fontWeight: "600",
              textAlign: "center",
              color: theme.text,
              marginBottom: 0,
            }),
          ]
        )
      ),
    ]
  );

export const contactAppointmentScheduler: Section = section(
  [
    singleColumnRow([
      el.text("BOOK A DEMO", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Thirty minutes with a real engineer", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "Not a sales deck. A working session with someone who will open your book in a sandbox and answer your hardest question.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(25, [
          slotCard("MONDAY", "Apr 27", ["09:00", "11:30", "14:00"]),
        ]),
        col(25, [
          slotCard("TUESDAY", "Apr 28", ["10:00", "13:00", "16:30"]),
        ]),
        col(25, [
          slotCard("WEDNESDAY", "Apr 29", ["09:30", "12:00", "15:00"]),
        ]),
        col(25, [
          slotCard("THURSDAY", "Apr 30", ["11:00", "14:30", "17:00"]),
        ]),
      ],
      { ...rowPresets.contained, gutter: 20, paddingBottom: 40 }
    ),
    singleColumnRow(
      [
        el.button("Confirm 30-minute demo", "#book", {
          fontSize: 16,
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 36,
          paddingRight: 36,
        }),
        el.text("Or email us directly at demo@company.com", {
          fontSize: 14,
          textAlign: "center",
          color: theme.textMuted,
          marginTop: 16,
          marginBottom: 0,
        }),
      ],
      { ...rowPresets.contained, textAlign: "center" }
    ),
  ],
  {
    name: "Appointment Scheduler",
    description: "Book a demo with calendar-like time-slot cards",
    category: "contact",
    slug: "contact-appointment-scheduler",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
