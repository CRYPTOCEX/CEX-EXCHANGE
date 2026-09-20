import type { Metadata } from "next";
import SubscriptionClient from "./client";

export const metadata: Metadata = {
  title: "My Subscriptions | Copy Trading",
  description: "Manage your copy trading subscriptions",
};

export default function Page() {
  return <SubscriptionClient />;
}
