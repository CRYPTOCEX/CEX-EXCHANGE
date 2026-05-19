"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageStoreSchema = exports.pageUpdateSchema = exports.basePageSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = {
    ...(0, schema_1.baseStringSchema)("ID of the CMS page"),
    nullable: true,
};
const title = (0, schema_1.baseStringSchema)("Title of the CMS page");
const content = {
    ...(0, schema_1.baseStringSchema)("Content of the CMS page"),
    maxLength: 16777215,
    minLength: 0,
};
const description = {
    ...(0, schema_1.baseStringSchema)("Short description of the CMS page"),
    nullable: true,
    maxLength: 1000,
};
const image = {
    ...(0, schema_1.baseStringSchema)("URL to the image associated with the CMS page"),
    nullable: true,
};
const slug = {
    ...(0, schema_1.baseStringSchema)("Slug for the CMS page URL"),
    pattern: "^[a-z0-9-_/]+$",
    maxLength: 255,
};
const path = {
    ...(0, schema_1.baseStringSchema)("URL path for the CMS page"),
    nullable: true,
};
const status = (0, schema_1.baseEnumSchema)("Publication status of the CMS page", [
    "PUBLISHED",
    "DRAFT",
]);
const order = (0, schema_1.baseIntegerSchema)("Display order of the page");
const visits = (0, schema_1.baseIntegerSchema)("Page view count");
const isHome = (0, schema_1.baseBooleanSchema)("Marks this page as the home page");
const isBuilderPage = (0, schema_1.baseBooleanSchema)("Indicates if the page is created with builder");
const template = {
    ...(0, schema_1.baseStringSchema)("Template name for the builder page"),
    nullable: true,
    maxLength: 100,
};
const category = {
    ...(0, schema_1.baseStringSchema)("Category for the page"),
    nullable: true,
    maxLength: 100,
};
const seoTitle = {
    ...(0, schema_1.baseStringSchema)("SEO title for the page"),
    nullable: true,
    maxLength: 255,
};
const seoDescription = {
    ...(0, schema_1.baseStringSchema)("SEO description for the page"),
    nullable: true,
    maxLength: 500,
};
const seoKeywords = {
    ...(0, schema_1.baseStringSchema)("SEO keywords for the page (comma separated)"),
    nullable: true,
};
const ogImage = {
    ...(0, schema_1.baseStringSchema)("Open Graph image URL"),
    nullable: true,
};
const ogTitle = {
    ...(0, schema_1.baseStringSchema)("Open Graph title"),
    nullable: true,
    maxLength: 255,
};
const ogDescription = {
    ...(0, schema_1.baseStringSchema)("Open Graph description"),
    nullable: true,
};
const settings = {
    ...(0, schema_1.baseStringSchema)("JSON string for additional page-level settings"),
    nullable: true,
};
const customCss = {
    ...(0, schema_1.baseStringSchema)("Custom CSS for the page"),
    nullable: true,
};
const customJs = {
    ...(0, schema_1.baseStringSchema)("Custom JS for the page"),
    nullable: true,
};
const lastModifiedBy = {
    ...(0, schema_1.baseStringSchema)("ID of the user who last modified the page"),
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
exports.basePageSchema = {
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
exports.pageUpdateSchema = {
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
exports.pageStoreSchema = {
    description: `Page created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.basePageSchema,
            },
        },
    },
};
