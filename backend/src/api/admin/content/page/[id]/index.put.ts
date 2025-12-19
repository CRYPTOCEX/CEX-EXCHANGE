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
  logModule: "ADMIN_CMS",
  logTitle: "Update page",
};

export default async (data: Handler) => {
  const { body, params, user, ctx } = data;
  const { id } = params;

  // Validate settings if present
  ctx?.step("Validating page data");
  if (body.settings) {
    try {
      JSON.parse(body.settings);
    } catch (err) {
      ctx?.fail("Invalid settings JSON");
      throw new Error("settings: Must be valid JSON");
    }
  }

  // Only include fields that are present in the body
  ctx?.step("Preparing update data");
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
      ctx?.fail("Slug is required");
      throw new Error("slug: Slug is required.");
    }
    if (body[key] !== undefined) {
      updateData[key] = body[key];
    }
  });

  // ---- NEW LOGIC: Enforce one-home-page rule ----
  if (updateData.isHome === true) {
    ctx?.step("Validating home page constraints");
    // Find another page with isHome true, and different id
    const otherHome = await models.page.findOne({
      where: {
        isHome: true,
        id: { [Op.ne]: id },
      },
    });
    if (otherHome) {
      ctx?.fail("Another page is already set as home page");
      throw new Error(
        "isHome: Only one page can be marked as home page. Please unset home on the other page first."
      );
    }
  }

  ctx?.step("Updating page in database");
  const result = await updateRecord("page", id, updateData);

  ctx?.success("Page updated successfully");
  return result;
};
