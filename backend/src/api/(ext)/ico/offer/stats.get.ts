import { models } from "@b/db";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get ICO Offering Statistics",
  description:
    "Retrieves count statistics for ICO token offerings across all statuses (ACTIVE, UPCOMING, COMPLETED).",
  operationId: "getIcoOfferingStats",
  tags: ["ICO", "Offerings"],
  logModule: "ICO",
  logTitle: "Get ICO Offer Stats",
  responses: {
    200: {
      description: "ICO offering statistics retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              active: {
                type: "number",
                description: "Total count of active offerings",
              },
              upcoming: {
                type: "number",
                description: "Total count of upcoming offerings",
              },
              completed: {
                type: "number",
                description: "Total count of completed offerings (SUCCESS + FAILED)",
              },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { ctx?: any }): Promise<any> => {
  try {
    const { ctx } = data || {};
    ctx?.step("Fetching ICO offering statistics");

    // Fetch counts for all statuses in parallel
    const [activeCount, upcomingCount, completedCount] = await Promise.all([
      models.icoTokenOffering.count({
        where: { status: "ACTIVE" },
      }),
      models.icoTokenOffering.count({
        where: { status: "UPCOMING" },
      }),
      models.icoTokenOffering.count({
        where: { status: { [Op.in]: ["SUCCESS", "FAILED"] } },
      }),
    ]);

    ctx?.success("ICO offering statistics retrieved successfully");

    return {
      active: activeCount,
      upcoming: upcomingCount,
      completed: completedCount,
    };
  } catch (error) {
    console.error("Error in getIcoOfferingStats:", error);
    throw error;
  }
};
