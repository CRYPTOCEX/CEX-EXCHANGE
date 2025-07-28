import type { Metadata } from "next";
import { AdminActivityClient } from "./client";
export const metadata: Metadata = {
  title: "Activity Log | Admin Dashboard",
  description: "View all platform activity and events",
};
export default function AdminActivityPage() {
  return <AdminActivityClient />;
}
