// /api/admin/pages/store.post.ts

import { storeRecordResponses } from "@b/utils/query";
import { pageStoreSchema, basePageSchema } from "./utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Stores or updates a CMS page",
  operationId: "storePage",
  tags: ["Admin", "Content", "Page"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: basePageSchema,
          required: ["title", "content", "slug", "status"],
        },
      },
    },
  },
  responses: storeRecordResponses(pageStoreSchema, "Page"),
  requiresAuth: true,
  permission: "create.page",
};

export default async (data: Handler) => {
  const { body, user } = data;
  const {
    title,
    content,
    description,
    image,
    slug,
    status,
    order,
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
  } = body;

  // Optional: validate settings JSON if present
  if (settings) {
    try {
      JSON.parse(settings);
    } catch (err) {
      throw new Error("settings: Must be valid JSON");
    }
  }

  const page = await models.page.create({
    title,
    content,
    description,
    image,
    slug,
    status,
    order,
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
    lastModifiedBy: user?.id || null, // Track who created the page
  });

  return page;
};
