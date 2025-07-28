import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Create a Token Offering Update",
  description:
    "Creates a new update for a token offering by the authenticated creator.",
  operationId: "createTokenOfferingUpdate",
  tags: ["ICO", "Creator", "Updates"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            tokenId: { type: "string", description: "Token offering ID" },
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
          required: ["tokenId", "title", "content"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token offering update created successfully.",
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
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { tokenId, title, content, attachments } = body;
  if (!tokenId || !title || !content) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  const update = await models.icoTokenOfferingUpdate.create({
    offeringId: tokenId,
    userId: user.id,
    title,
    content,
    attachments: attachments || [],
  });

  try {
    await createNotification({
      userId: user.id,
      relatedId: tokenId,
      type: "system",
      title: "New Update Created",
      message: `New update "${title}" created successfully.`,
      details:
        "Your token offering update has been posted and is now visible to your investors.",
      link: `/ico/creator/token/${tokenId}?tab=updates`,
      actions: [
        {
          label: "View Update",
          link: `/ico/creator/token/${tokenId}?tab=updates`,
          primary: true,
        },
      ],
    });
  } catch (notifErr) {
    console.error(
      "Failed to create notification for update creation",
      notifErr
    );
  }

  return { message: "Update created successfully.", update };
};
