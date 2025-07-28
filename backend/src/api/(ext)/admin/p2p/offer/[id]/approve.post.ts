import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Approve P2P Offer (Admin)",
  description: "Approves a user offer on the P2P platform.",
  operationId: "approveAdminP2POffer",
  tags: ["Admin", "Offers", "P2P"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Offer ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Optional notes for approval",
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            notes: { type: "string" },
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Offer approved successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Offer not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.p2p.offer",
};

export default async (data) => {
  const { params, body } = data;
  const { id } = params;
  const { notes } = body;

  try {
    const offer = await models.p2pOffer.findByPk(id);
    if (!offer)
      throw createError({ statusCode: 404, message: "Offer not found" });
    await offer.update({
      status: "approved",
      activityLog: [
        ...(offer.activityLog || []),
        {
          type: "approval",
          notes,
          adminId: data.user.id,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    return { message: "Offer approved successfully." };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
