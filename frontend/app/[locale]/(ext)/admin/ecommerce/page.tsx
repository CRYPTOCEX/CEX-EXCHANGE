import DashboardClient from "./dashboard-client";

export const metadata = {
  title: "Dashboard | Admin",
  description: "Overview of your store's performance and recent activity",
};

export default function Page() {
  return <DashboardClient />;
}
