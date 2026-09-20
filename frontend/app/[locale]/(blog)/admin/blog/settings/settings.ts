import {
  Users,
  FileText,
  Layout,
  Settings,
} from "lucide-react";
import {
  FieldDefinition,
  SettingsPageConfig,
  TabDefinition,
  TabColors,
} from "@/components/admin/settings";

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
];

// Tab colors for blog settings
export const BLOG_TAB_COLORS: Record<string, TabColors> = {
  general: {
    bg: "bg-chart-1/10",
    text: "text-chart-1",
    border: "border-chart-1/20",
    iconBg: "bg-chart-1",
  },
  authors: {
    bg: "bg-chart-2/10",
    text: "text-chart-2",
    border: "border-chart-2/20",
    iconBg: "bg-chart-2",
  },
  content: {
    bg: "bg-chart-3/10",
    text: "text-chart-3",
    border: "border-chart-3/20",
    iconBg: "bg-chart-3",
  },
  display: {
    bg: "bg-chart-4/10",
    text: "text-chart-4",
    border: "border-chart-4/20",
    iconBg: "bg-chart-4",
  },
};

// Field definitions for blog settings
//
// THREE CONTROLS WERE REMOVED, all of them read by nothing.
//   `maxCategoriesPerPost` (1-5, default 3) offered to cap something that
//   cannot vary: `post.categoryId` is a NOT NULL single FK, `post.belongsTo
//   (category)`, and the editor renders one mandatory <Select>. Contrast
//   `maxTagsPerPost`, which is genuinely enforced server-side in
//   `backend/src/api/blog/post/tags.ts`.
//   `defaultMetaDescription` and `defaultMetaKeywords` took the SEO tab with
//   them. They were not filling a metadata hole: `blog/[slug]/page.tsx` already
//   falls back to a 160-character excerpt of the post body and derives keywords
//   from the post's category and tags, so neither value was ever reachable.
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
  //
  // "Blog Post Layout" used to sit here — a select offering Default / Modern /
  // Classic. Nothing read it: `blogPostLayout` was spelled in exactly two places
  // in the repository, this field definition and the default beside it, and no
  // blog component, route or template ever consulted the setting. An operator
  // could pick Modern, save, watch the row be written, and see an identical
  // blog. It is removed rather than left as a control that silently does
  // nothing — the same call made for the affiliate "Default Commission Rate".
  // There is one post layout; a second one would need components before it
  // needs a setting.

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
    subcategory: "Tags",
    min: 1,
    max: 20,
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
];

// Default settings values
export const BLOG_DEFAULT_SETTINGS: Record<string, any> = {
  blogStatus: "true",
  // No `blogPostLayout` — see the note where its control used to be.
  enableAuthorApplications: true,
  autoApproveAuthors: false,
  maxPostsPerAuthor: 0,
  maxTagsPerPost: 5,
  enableComments: true,
  moderateComments: true,
  postsPerPage: 10,
  showAuthorBio: true,
  showRelatedPosts: true,
};

/**
 * The page config — ONE object, TWO consumers.
 *
 * `client.tsx` passes this to `SettingsPage` and `loading.tsx` passes the same
 * object to `SettingsPageSkeleton`. It lives here, in the route's plain data
 * module, because both of those files need it and neither can import from the
 * other: `client.tsx` is a `"use client"` module, so anything defined there is a
 * client-reference proxy rather than a value.
 *
 * Before this, `title`, `description` and `backUrl` were typed out in both
 * files, with nothing keeping the two copies in step — rename the page and the
 * pending state keeps announcing the old name until first paint. One object
 * makes that disagreement unrepresentable.
 *
 * Keep this a PLAIN DATA OBJECT. Callbacks (`onBeforeSave`/`onAfterSave`) and
 * anything closing over client state stay in `client.tsx` and spread on top —
 * the skeleton never invokes them, and a function here would be one more thing
 * that has to survive being imported by a file whose whole job is to render
 * before any of it runs.
 */
export const BLOG_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "Blog Settings",
  description: "Configure your blog settings and preferences",
  backUrl: "/admin/blog",
  apiEndpoint: "/api/admin/system/settings",
  tabs: BLOG_TABS,
  fields: BLOG_FIELD_DEFINITIONS,
  tabColors: BLOG_TAB_COLORS,
  defaultValues: BLOG_DEFAULT_SETTINGS,
};
