import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get Creator ICO Offerings",
  description:
    "Retrieves ICO offerings for the authenticated creator, grouped by status (active, pending, completed) along with currentRaised for each offering.",
  operationId: "getCreatorOfferings",
  tags: ["ICO", "Creator", "Offerings"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Creator offerings retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              active: { type: "array", items: { type: "object" } },
              pending: { type: "array", items: { type: "object" } },
              completed: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Fetch offerings for the current creator.
  const offerings = await models.icoTokenOffering.findAll({
    where: { userId: user.id },
    raw: true,
  });

  // If there are no offerings, return empty arrays.
  if (!offerings.length) {
    return { active: [], pending: [], completed: [] };
  }

  // Get a list of offering IDs.
  const offeringIds = offerings.map((o) => o.id);

  // Query transactions to calculate currentRaised for each offering (excluding "REJECTED" transactions).
  const currentRaisedData = await models.icoTransaction.findAll({
    attributes: [
      "offeringId",
      [fn("SUM", literal("price * amount")), "currentRaised"],
    ],
    where: {
      offeringId: { [Op.in]: offeringIds },
      status: { [Op.not]: ["REJECTED"] },
    },
    group: ["offeringId"],
    raw: true,
  });

  // Create a mapping from offeringId to currentRaised.
  const raisedMap: Record<string, number> = {};
  currentRaisedData.forEach((row) => {
    raisedMap[row.offeringId] = parseFloat(row.currentRaised) || 0;
  });

  // Attach currentRaised to each offering.
  const offeringsWithRaised = offerings.map((offering) => ({
    ...offering,
    currentRaised: raisedMap[offering.id] || 0,
  }));

  // Group offerings by status.
  const active = offeringsWithRaised.filter((o) => o.status === "ACTIVE");
  const pending = offeringsWithRaised.filter((o) => o.status === "PENDING");
  const completed = offeringsWithRaised.filter((o) => o.status === "SUCCESS");

  return { active, pending, completed };
};
