import type { Metadata } from "next";
import FollowerGuidePage from "./client";

export const metadata: Metadata = {
  title: "Follower Guide | Copy Trading",
  description: "Complete guide for copy trading followers",
};

export default function Page() {
  return <FollowerGuidePage />;
}
