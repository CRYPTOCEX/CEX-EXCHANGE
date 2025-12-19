import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "overview",
    title: "Overview",
    description:
      "Knowledge base analytics with popular articles, search trends, and user engagement metrics.",
    href: "/admin/faq",
    icon: "lucide:bar-chart-2",
    exact: true,
  },
  {
    key: "manage",
    title: "Manage",
    description:
      "Create, edit, and organize FAQ articles with rich content editing tools.",
    href: "/admin/faq/manage",
    icon: "lucide:settings",
  },
  {
    key: "feedback",
    title: "Feedback",
    description:
      "Review user feedback on articles, identify improvement areas, and measure helpfulness.",
    href: "/admin/faq/feedback",
    icon: "lucide:thumbs-up",
  },
  {
    key: "questions",
    title: "Questions",
    description:
      "Manage user-submitted questions, assign to categories, and track response status.",
    href: "/admin/faq/question",
    icon: "lucide:message-square",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.knowledge_base;
