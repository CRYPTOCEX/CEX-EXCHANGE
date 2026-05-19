import type { Metadata } from "next";
import NotificationsClient from "./client";

export const metadata: Metadata = {
  title: "Notifications | Creator Dashboard",
  description: "Manage and view all your token offering notifications",
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
