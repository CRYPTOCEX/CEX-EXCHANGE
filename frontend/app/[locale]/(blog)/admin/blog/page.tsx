import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import { AdminDashboardClient } from "./client";

export default function AdminDashboardPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <AdminDashboardClient />
    </div>
  );
}
