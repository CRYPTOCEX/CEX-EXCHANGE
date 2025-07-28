import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get P2P Offer by ID (Admin)",
  description: "Retrieves detailed information about a specific offer.",
  operationId: "getAdminP2POfferById",
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
  responses: {
    200: { description: "Offer retrieved successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Offer not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "view.p2p.dispute",
};

export default async (data) => {
  const { params } = data;
  const { id } = params;

  try {
    const offer = await models.p2pOffer.findByPk(id, {
      include: [
        {
          association: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        { association: "paymentMethods" },
      ],
    });
    if (!offer)
      throw createError({ statusCode: 404, message: "Offer not found" });
    return offer.toJSON();
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
