import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Edit a Token Offering Update",
  description:
    "Edits an existing update for a token offering by the authenticated creator.",
  operationId: "editTokenOfferingUpdate",
  tags: ["ICO", "Creator", "Updates"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "updateId",
      in: "path",
      description: "Token offering update ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Updated token offering update data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            attachments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["image", "document", "link"] },
                  url: { type: "string" },
                  name: { type: "string" },
                },
              },
            },
          },
          required: ["title", "content"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token offering update updated successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              update: { type: "object" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Update not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { updateId } = params;
  if (!updateId) {
    throw createError({ statusCode: 400, message: "Missing update ID" });
  }
  const { title, content, attachments } = body;
  if (!title || !content) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  const updateRecord = await models.icoTokenOfferingUpdate.findByPk(updateId);
  if (!updateRecord) {
    throw createError({ statusCode: 404, message: "Update not found" });
  }
  if (updateRecord.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  const oldTitle = updateRecord.title;
  await updateRecord.update({
    title,
    content,
    attachments: attachments || [],
  });

  try {
    await createNotification({
      userId: user.id,
      relatedId: updateRecord.offeringId,
      type: "system",
      title: "Update Updated",
      message: `Token offering update "${title}" updated successfully.`,
      details: `Your update has been modified.${oldTitle !== title ? ` Title changed from "${oldTitle}" to "${title}".` : ""}`,
      link: updateRecord.offeringId
        ? `/ico/creator/token/${updateRecord.offeringId}?tab=updates`
        : undefined,
      actions: updateRecord.offeringId
        ? [
            {
              label: "View Update",
              link: `/ico/creator/token/${updateRecord.offeringId}?tab=updates`,
              primary: true,
            },
          ]
        : [],
    });
  } catch (notifErr) {
    console.error("Failed to create notification for update edit", notifErr);
  }

  return { message: "Update updated successfully.", update: updateRecord };
};
