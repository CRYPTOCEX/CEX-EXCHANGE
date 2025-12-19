import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "campaigns",
    title: "Campaigns",
    description:
      "Create and manage email marketing campaigns with scheduling and automation.",
    href: "/admin/mailwizard/campaign",
    icon: "lucide:megaphone",
  },
  {
    key: "templates",
    title: "Templates",
    description:
      "Design reusable email templates with drag-and-drop editor and dynamic content.",
    href: "/admin/mailwizard/template",
    icon: "lucide:layout-template",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.mailwizard;
