import {
  baseStringSchema,
  baseEnumSchema,
  baseBooleanSchema,
  baseIntegerSchema,
} from "@b/utils/schema"; // Adjust as needed

// === Base components for all fields ===
const id = {
  ...baseStringSchema("ID of the CMS page"),
  nullable: true,
};

const title = baseStringSchema("Title of the CMS page");

const content = {
  ...baseStringSchema("Content of the CMS page"),
  maxLength: 16777215, // Support for long content (MySQL MEDIUMTEXT), adjust as needed
  minLength: 0,
};

const description = {
  ...baseStringSchema("Short description of the CMS page"),
  nullable: true,
  maxLength: 1000,
};

const image = {
  ...baseStringSchema("URL to the image associated with the CMS page"),
  nullable: true,
};

const slug = {
  ...baseStringSchema("Slug for the CMS page URL"),
  pattern: "^[a-z0-9-_/]+$",
  maxLength: 255,
};

const path = {
  ...baseStringSchema("URL path for the CMS page"),
  nullable: true,
};

const status = baseEnumSchema("Publication status of the CMS page", [
  "PUBLISHED",
  "DRAFT",
]);

const order = baseIntegerSchema("Display order of the page");
const visits = baseIntegerSchema("Page view count");

const isHome = baseBooleanSchema("Marks this page as the home page");
const isBuilderPage = baseBooleanSchema(
  "Indicates if the page is created with builder"
);

const template = {
  ...baseStringSchema("Template name for the builder page"),
  nullable: true,
  maxLength: 100,
};
const category = {
  ...baseStringSchema("Category for the page"),
  nullable: true,
  maxLength: 100,
};

// SEO/OG fields
const seoTitle = {
  ...baseStringSchema("SEO title for the page"),
  nullable: true,
  maxLength: 255,
};
const seoDescription = {
  ...baseStringSchema("SEO description for the page"),
  nullable: true,
  maxLength: 500,
};
const seoKeywords = {
  ...baseStringSchema("SEO keywords for the page (comma separated)"),
  nullable: true,
};

const ogImage = {
  ...baseStringSchema("Open Graph image URL"),
  nullable: true,
};
const ogTitle = {
  ...baseStringSchema("Open Graph title"),
  nullable: true,
  maxLength: 255,
};
const ogDescription = {
  ...baseStringSchema("Open Graph description"),
  nullable: true,
};

const settings = {
  ...baseStringSchema("JSON string for additional page-level settings"),
  nullable: true,
  // Optionally: pattern: "^{.*}$" (valid JSON) — better to validate in runtime
};

const customCss = {
  ...baseStringSchema("Custom CSS for the page"),
  nullable: true,
};
const customJs = {
  ...baseStringSchema("Custom JS for the page"),
  nullable: true,
};

const lastModifiedBy = {
  ...baseStringSchema("ID of the user who last modified the page"),
  nullable: true,
};
const publishedAt = {
  type: "string",
  format: "date-time",
  description: "When the page was published",
  nullable: true,
};
const createdAt = {
  type: "string",
  format: "date-time",
  description: "Page creation date",
  nullable: true,
};
const updatedAt = {
  type: "string",
  format: "date-time",
  description: "Page last update date",
  nullable: true,
};
const deletedAt = {
  type: "string",
  format: "date-time",
  description: "Page deletion date (if soft deleted)",
  nullable: true,
};

// === Full page schema ===
export const basePageSchema = {
  id,
  title,
  content,
  description,
  image,
  slug,
  path,
  status,
  order,
  visits,
  isHome,
  isBuilderPage,
  template,
  category,
  seoTitle,
  seoDescription,
  seoKeywords,
  ogImage,
  ogTitle,
  ogDescription,
  settings,
  customCss,
  customJs,
  lastModifiedBy,
  publishedAt,
  createdAt,
  updatedAt,
  deletedAt,
};

// === Update schema ===
export const pageUpdateSchema = {
  type: "object",
  properties: {
    title,
    content,
    description,
    image,
    slug,
    path,
    status,
    order,
    visits,
    isHome,
    isBuilderPage,
    template,
    category,
    seoTitle,
    seoDescription,
    seoKeywords,
    ogImage,
    ogTitle,
    ogDescription,
    settings,
    customCss,
    customJs,
    lastModifiedBy,
    publishedAt,
  },
  required: ["title", "content", "slug", "status"],
};

// === Store response schema ===
export const pageStoreSchema = {
  description: `Page created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: basePageSchema,
      },
    },
  },
};
