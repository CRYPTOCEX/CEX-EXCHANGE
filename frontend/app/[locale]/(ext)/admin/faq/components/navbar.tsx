"use client";

import { ExtNavbar, NavItem } from "@/app/[locale]/(ext)/navbar";
import { Settings, BarChart2, ThumbsUp, MessageSquare } from "lucide-react";

const adminNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/admin/faq",
    icon: BarChart2,
    exact: true,
  },
  {
    title: "Manage",
    href: "/admin/faq/manage",
    icon: Settings,
  },
  {
    title: "Feedback",
    href: "/admin/faq/feedback",
    icon: ThumbsUp,
  },
  {
    title: "Questions",
    href: "/admin/faq/question",
    icon: MessageSquare,
  },
];

export default function AdminNavbar() {
  return (
    <ExtNavbar
      navItems={adminNavItems}
      isAdmin={true}
    />
  );
}
