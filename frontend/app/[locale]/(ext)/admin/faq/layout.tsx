import type { ReactNode } from "react";
import AdminNavbar from "./components/navbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/5">
      <AdminNavbar />
      <main className="flex-1 py-8">
        <div className="container mx-auto">{children}</div>
      </main>
    </div>
  );
}
