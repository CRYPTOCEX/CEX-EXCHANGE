import type { Metadata } from "next";
import NftModerationDashboard from "./client";

export const metadata: Metadata = {
  title: "NFT Moderation",
  description:
    "Collections awaiting approval, open disputes, frozen settlements and catalogue defects on the NFT marketplace",
};

/**
 * No wrapper.
 *
 * This used to return `<div className={"container " + PAGE_PADDING}>`, which is
 * exactly the hand-rolled frame R0 exists to delete: the client owns a
 * `PageShell` with a full-bleed masthead, and a `container` around it would clip
 * the band to the content column and double the horizontal padding.
 */
export default function NFTAdminPage() {
  return <NftModerationDashboard />;
}
