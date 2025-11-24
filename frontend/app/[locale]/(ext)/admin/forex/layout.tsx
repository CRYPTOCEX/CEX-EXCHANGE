import type { ReactNode } from "react";
import AdminNavbar from "./navbar";
import { LayoutWrapper } from "@/components/partials/dashboard/layout-wrapper";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminNavbar />
      <div className="content-wrapper transition-all duration-150">
        <div className="pt-5 px-6 pb-20 page-min-height-horizontal">
          <LayoutWrapper>{children}</LayoutWrapper>
        </div>
      </div>
    </>
  );
}
