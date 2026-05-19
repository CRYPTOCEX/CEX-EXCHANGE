import {
  Users,
  FileText,
  Layout,
  Search,
  Settings,
} from "lucide-react";
import { FieldDefinition, TabDefinition, TabColors } from "@/components/admin/settings";

// Tab definitions for blog settings
export const BLOG_TABS: TabDefinition[] = [
  {
    id: "general",
    label: "General",
    icon: Settings,
    description: "Configure general blog settings",
  },
  {
    id: "authors",
    label: "Authors",
    icon: Users,
    description: "Configure author applications and limits",
  },
  {
    id: "content",
    label: "Content",
    icon: FileText,
    description: "Configure content creation and moderation",
  },
  {
    id: "display",
    label: "Display",
    icon: Layout,
    description: "Configure how content is displayed",
  },
  {
    id: "seo",
    label: "SEO",
    icon: Search,
    description: "Configure search engine optimization",
  },
];

// Tab colors for blog settings
export const BLOG_TAB_COLORS: Record<string, TabColors> = {
  general: {
    bg: "bg-slate-500/10",
    text: "text-slate-500",
    border: "border-slate-500/20",
    gradient: "from-slate-500/20 via-slate-400/10 to-transparent",
    glow: "shadow-slate-500/20",
    iconBg: "bg-gradient-to-br from-slate-500 to-gray-600",
  },
  authors: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
    glow: "shadow-blue-500/20",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
  },
  content: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    glow: "shadow-emerald-500/20",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
  },
  display: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
    gradient: "from-purple-500/20 via-purple-400/10 to-transparent",
    glow: "shadow-purple-500/20",
    iconBg: "bg-gradient-to-br from-purple-500 to-violet-600",
  },
  seo: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    gradient: "from-amber-500/20 via-amber-400/10 to-transparent",
    glow: "shadow-amber-500/20",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
  },
};

// Field definitions for blog settings
export const BLOG_FIELD_DEFINITIONS: FieldDefinition[] = [
  // General Settings
  {
    key: "blogStatus",
    label: "Enable Blog",
    type: "switch",
    description: "Enable blog functionality on the platform",
    category: "general",
    subcategory: "Blog Status",
  },
  {
    key: "blogPostLayout",
    label: "Blog Post Layout",
    type: "select",
    description: "Select the layout for blog posts",
    category: "general",
    subcategory: "Appearance",
    options: [
      { label: "Default", value: "DEFAULT" },
      { label: "Modern", value: "MODERN" },
      { label: "Classic", value: "CLASSIC" },
    ],
    showIf: (values) => {
      const val = values.blogStatus;
      return val === "true" || (typeof val === 'boolean' && val === true);
    },
  },

  // Author Settings
  {
    key: "enableAuthorApplications",
    label: "Enable Author Applications",
    type: "switch",
    description: "Allow users to apply to become blog authors",
    category: "authors",
    subcategory: "Applications",
  },
  {
    key: "autoApproveAuthors",
    label: "Auto-Approve Authors",
    type: "switch",
    description: "Automatically approve all author applications without review",
    category: "authors",
    subcategory: "Applications",
  },
  {
    key: "maxPostsPerAuthor",
    label: "Maximum Posts Per Author",
    type: "number",
    description: "Limit the number of posts an author can create (0 = unlimited)",
    category: "authors",
    subcategory: "Limits",
    min: 0,
    max: 50,
    step: 1,
  },

  // Content Settings
  {
    key: "maxTagsPerPost",
    label: "Maximum Tags Per Post",
    type: "number",
    description: "Limit the number of tags that can be added to a post",
    category: "content",
    subcategory: "Tags & Categories",
    min: 1,
    max: 20,
    step: 1,
  },
  {
    key: "maxCategoriesPerPost",
    label: "Maximum Categories Per Post",
    type: "number",
    description: "Limit the number of categories that can be assigned to a post",
    category: "content",
    subcategory: "Tags & Categories",
    min: 1,
    max: 5,
    step: 1,
  },
  {
    key: "enableComments",
    label: "Enable Comments",
    type: "switch",
    description: "Allow users to comment on blog posts",
    category: "content",
    subcategory: "Comments",
  },
  {
    key: "moderateComments",
    label: "Moderate Comments",
    type: "switch",
    description: "Review and approve comments before they are published",
    category: "content",
    subcategory: "Comments",
  },

  // Display Settings
  {
    key: "postsPerPage",
    label: "Posts Per Page",
    type: "number",
    description: "Number of posts to display per page in listings",
    category: "display",
    subcategory: "Pagination",
    min: 5,
    max: 50,
    step: 5,
  },
  {
    key: "showAuthorBio",
    label: "Show Author Bio",
    type: "switch",
    description: "Display author biography on post pages",
    category: "display",
    subcategory: "Post Display",
  },
  {
    key: "showRelatedPosts",
    label: "Show Related Posts",
    type: "switch",
    description: "Display related posts at the end of each article",
    category: "display",
    subcategory: "Post Display",
  },

  // SEO Settings
  {
    key: "defaultMetaDescription",
    label: "Default Meta Description",
    type: "text",
    description: "Used when a post doesn't have a specific description. Recommended: 150-160 characters.",
    category: "seo",
    subcategory: "Meta Tags",
    fullWidth: true,
  },
  {
    key: "defaultMetaKeywords",
    label: "Default Meta Keywords",
    type: "text",
    description: "Comma-separated keywords used for SEO. Example: blog, articles, content",
    category: "seo",
    subcategory: "Meta Tags",
    fullWidth: true,
  },
];

// Default settings values
export const BLOG_DEFAULT_SETTINGS: Record<string, any> = {
  blogStatus: "true",
  blogPostLayout: "DEFAULT",
  enableAuthorApplications: true,
  autoApproveAuthors: false,
  maxPostsPerAuthor: 0,
  maxTagsPerPost: 5,
  maxCategoriesPerPost: 3,
  enableComments: true,
  moderateComments: true,
  postsPerPage: 10,
  showAuthorBio: true,
  showRelatedPosts: true,
  defaultMetaDescription: "Your blog's default meta description",
  defaultMetaKeywords: "blog, articles, content",
};
