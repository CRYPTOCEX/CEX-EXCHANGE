import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "faq-home",
    title: "FAQ Home",
    href: "/faq",
    icon: "lucide:help-circle",
    exact: true,
    description:
      "Browse help articles organized by topic for quick access to relevant information.",
  },
  {
    key: "troubleshooter",
    title: "Troubleshooter",
    href: "/faq/troubleshooter",
    icon: "lucide:lightbulb",
    description:
      "Search our knowledge base for instant answers to your questions.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.faq;
export const adminPath = "/admin/faq";
