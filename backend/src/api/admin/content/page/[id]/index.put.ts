// /api/admin/pages/[id]/update.put.ts

import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { pageUpdateSchema } from "../utils";
import { models } from "@b/db";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Updates an existing page",
  operationId: "updatePage",
  tags: ["Admin", "Content", "Page"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the page to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the page",
    content: {
      "application/json": {
        schema: pageUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Page"),
  requiresAuth: true,
  permission: "edit.page",
};

export default async (data: Handler) => {
  const { body, params, user } = data;
  const { id } = params;

  // Validate settings if present
  if (body.settings) {
    try {
      JSON.parse(body.settings);
    } catch (err) {
      throw new Error("settings: Must be valid JSON");
    }
  }

  // Only include fields that are present in the body
  const updateData: Record<string, any> = { lastModifiedBy: user?.id || null };
  [
    "title",
    "content",
    "description",
    "image",
    "slug",
    "status",
    "order",
    "isHome",
    "isBuilderPage",
    "template",
    "category",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "ogImage",
    "ogTitle",
    "ogDescription",
    "settings",
    "customCss",
    "customJs",
  ].forEach((key) => {
    // If slug is required and missing, throw an error
    if (
      key === "slug" &&
      (body[key] === undefined || body[key] === null || body[key] === "")
    ) {
      throw new Error("slug: Slug is required.");
    }
    if (body[key] !== undefined) {
      updateData[key] = body[key];
    }
  });

  // ---- NEW LOGIC: Enforce one-home-page rule ----
  if (updateData.isHome === true) {
    // Find another page with isHome true, and different id
    const otherHome = await models.page.findOne({
      where: {
        isHome: true,
        id: { [Op.ne]: id },
      },
    });
    if (otherHome) {
      throw new Error(
        "isHome: Only one page can be marked as home page. Please unset home on the other page first."
      );
    }
  }

  return await updateRecord("page", id, updateData);
};
