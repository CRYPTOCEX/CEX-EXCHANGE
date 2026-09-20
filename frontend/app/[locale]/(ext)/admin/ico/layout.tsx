import type React from "react";
import type { Metadata } from "next";
import { AdminIcoLayoutClient } from "./layout-client";

export const metadata: Metadata = {
  title: {
    default: "Initial Token Offering",
    template: "%s",
  },
  description: "Launch and invest in the next generation of digital assets",
};

export default function AdminIcoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminIcoLayoutClient>{children}</AdminIcoLayoutClient>;
}
