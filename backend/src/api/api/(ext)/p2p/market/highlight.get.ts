import { models } from "@b/db";
import { serverErrorResponse, unauthorizedResponse } from "@b/utils/query";

export const metadata = {
  summary: "Get P2P Market Highlights",
  description:
    "Retrieves highlighted market data (for example, top active offers).",
  operationId: "getP2PMarketHighlights",
  tags: ["P2P", "Market"],
  responses: {
    200: { description: "P2P market highlights retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
};

export default async (data: { query?: any }) => {
  try {
    // Example: get the five newest active offers
    const highlights = await models.p2pOffer.findAll({
      where: { status: "active" },
      order: [["createdAt", "DESC"]],
      limit: 5,
    });
    return highlights;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
