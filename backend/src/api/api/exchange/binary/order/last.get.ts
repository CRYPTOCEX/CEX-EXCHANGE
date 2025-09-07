// /server/api/binary/orders/index.get.ts

import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { Op } from "sequelize";
import { subDays } from "date-fns";

export const metadata: OperationObject = {
  summary: "List Binary Orders from Last 30 Days",
  operationId: "listBinaryOrdersLast30Days",
  tags: ["Binary", "Orders"],
  description:
    "Retrieves the non-pending binary orders for practice and non-practice accounts from the last 30 days and compares them with the previous month.",
  responses: {
    200: {
      description: "A list of binary orders from the last 30 days",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              practiceOrders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {},
                },
              },
              nonPracticeOrders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {},
                },
              },
              livePercentageChange: { type: "number" },
              practicePercentageChange: { type: "number" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Order"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw new Error("Unauthorized");

  try {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sixtyDaysAgo = subDays(new Date(), 60);

    const allOrdersLast30Days = await models.binaryOrder.findAll({
      where: {
        userId: user.id,
        status: { [Op.not]: "PENDING" },
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
      order: [["createdAt", "DESC"]],
    });

    const allOrdersLast60Days = await models.binaryOrder.findAll({
      where: {
        userId: user.id,
        status: { [Op.not]: "PENDING" },
        createdAt: { [Op.between]: [sixtyDaysAgo, thirtyDaysAgo] },
      },
      order: [["createdAt", "DESC"]],
    });

    const practiceOrdersLast30Days = allOrdersLast30Days.filter(
      (order) => order.isDemo
    );
    const liveOrdersLast30Days = allOrdersLast30Days.filter(
      (order) => !order.isDemo
    );

    const practiceOrdersLast60Days = allOrdersLast60Days.filter(
      (order) => order.isDemo
    );
    const liveOrdersLast60Days = allOrdersLast60Days.filter(
      (order) => !order.isDemo
    );

    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const livePercentageChange = calculatePercentageChange(
      liveOrdersLast30Days.length,
      liveOrdersLast60Days.length
    );

    const practicePercentageChange = calculatePercentageChange(
      practiceOrdersLast30Days.length,
      practiceOrdersLast60Days.length
    );

    return {
      practiceOrders: practiceOrdersLast30Days,
      nonPracticeOrders: liveOrdersLast30Days,
      livePercentageChange,
      practicePercentageChange,
    };
  } catch (error) {
    console.error("Error :", error);
    return {
      status: 500,
      body: {
        message: "Internal Server Error",
        error: error.message,
      },
    };
  }
};
