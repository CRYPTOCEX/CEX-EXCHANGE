import { TokenReleaseClient } from "@/app/[locale]/(ext)/ico/creator/token/[id]/release/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Token Release | Creator Dashboard",
  description:
    "Release tokens to investors after the token sale phase is complete.",
};

export default function TokenReleasePage() {
  return <TokenReleaseClient />;
}
