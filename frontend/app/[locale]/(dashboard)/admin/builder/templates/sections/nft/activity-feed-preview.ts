import type { Section, Row } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  sectionPresets,
} from "../../utils";

const activityRow = (
  image: string,
  actor: string,
  action: string,
  item: string,
  price: string,
  time: string,
  isLast = false
): Row =>
  row(
    [
      col(10, [
        el.image(image, `${item} thumbnail`, {
          borderRadius: 10,
          width: "56px",
          height: "56px",
        }),
      ]),
      col(60, [
        el.text(
          `<strong style="color: var(--builder-text, currentColor); font-weight: 700;">${actor}</strong> ${action} <strong style="color: var(--builder-text, currentColor); font-weight: 700;">${item}</strong>`,
          {
            fontSize: 14,
            color: theme.textMuted,
            marginBottom: 4,
            lineHeight: "1.5",
          }
        ),
        el.text(time, {
          fontSize: 12,
          color: theme.textDim,
          marginBottom: 0,
        }),
      ]),
      col(30, [
        el.text(price, {
          fontSize: 15,
          fontWeight: "700",
          color: theme.text,
          textAlign: "right",
          marginBottom: 0,
        }),
      ]),
    ],
    {
      gutter: 12,
      verticalAlign: "middle",
      maxWidth: "960px",
      paddingTop: 18,
      paddingBottom: 18,
      paddingLeft: 28,
      paddingRight: 28,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
      borderTop: true,
      borderLeft: true,
      borderRight: true,
      borderBottom: isLast,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: isLast ? 18 : 0,
      borderBottomRightRadius: isLast ? 18 : 0,
      marginBottom: 0,
    }
  );

const headerRow = (): Row =>
  row(
    [
      col(100, [
        el.text("RECENT TRADES", {
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: "0.16em",
          color: theme.textMuted,
          marginBottom: 0,
        }),
      ]),
    ],
    {
      maxWidth: "960px",
      paddingTop: 22,
      paddingBottom: 22,
      paddingLeft: 28,
      paddingRight: 28,
      backgroundColor: theme.bgElevated,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
      borderRadius: 18,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginBottom: 0,
    }
  );

export const nftActivityFeedPreview: Section = section(
  [
    singleColumnRow([
      el.text("LIVE ACTIVITY", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.violet,
        marginBottom: 12,
      }),
      el.heading("What's trading right now", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Every sale, listing, and transfer across platform collections — streaming in real time.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 48,
        }
      ),
    ]),
    headerRow(),
    activityRow(
      "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&q=80",
      "0x4a2b…e91f",
      "bought",
      "Cyber Apes #4821",
      "0.48 ETH",
      "12 seconds ago"
    ),
    activityRow(
      "https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=400&q=80",
      "iris.eth",
      "listed",
      "Genesis Proto #112",
      "1.25 ETH",
      "45 seconds ago"
    ),
    activityRow(
      "https://images.unsplash.com/photo-1633101585272-9e0b0c3d9f9e?w=400&q=80",
      "miravos.eth",
      "minted",
      "Quantum Koi #217",
      "0.08 ETH",
      "2 minutes ago"
    ),
    activityRow(
      "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=400&q=80",
      "0x8c11…204a",
      "bought",
      "Voidwalkers #64",
      "0.92 ETH",
      "4 minutes ago"
    ),
    activityRow(
      "https://images.unsplash.com/photo-1614812513172-567d2fe96a75?w=400&q=80",
      "neon.eth",
      "transferred",
      "Neon Society #09",
      "—",
      "6 minutes ago",
      true
    ),
  ],
  {
    name: "Activity Feed Preview",
    description: "Live-style NFT activity feed — bought, listed, minted, transferred",
    category: "nft",
    slug: "nft-activity-feed-preview",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
