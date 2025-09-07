import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get KYC Analytics Data",
  description:
    "Fetches analytics data for KYC including total users, verified users, pending verifications, rejected verifications, and completion rates for each level.",
  operationId: "getKycAnalyticsData",
  tags: ["KYC", "Analytics"],
  responses: {
    200: {
      description: "KYC analytics data retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalUsers: { type: "number" },
              verifiedUsers: { type: "number" },
              pendingVerifications: { type: "number" },
              rejectedVerifications: { type: "number" },
              completionRates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    level: { type: "number" },
                    name: { type: "string" },
                    rate: { type: "number" },
                    users: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error." },
  },
  permission: "view.kyc.level",
  requiresAuth: true,
};

export default async (_data: { query?: any }): Promise<any> => {
  try {
    const applications = await models.kycApplication.findAll();
    const levels = await models.kycLevel.findAll();
    const users = await models.user.findAll();

    const totalUsers = users.length;
    const verifiedUsers = applications.filter(
      (app: any) => app.status === "APPROVED"
    ).length;
    const pendingVerifications = applications.filter(
      (app: any) => app.status === "PENDING"
    ).length;
    const rejectedVerifications = applications.filter(
      (app: any) => app.status === "REJECTED"
    ).length;

    const completionRates = levels
      .map((level: any) => {
        const levelApps = applications.filter(
          (app: any) => app.levelId === level.id
        );
        const approvedApps = levelApps.filter(
          (app: any) => app.status === "APPROVED"
        );
        const rate =
          levelApps.length > 0
            ? Math.round((approvedApps.length / levelApps.length) * 100)
            : 0;
        return {
          level: level.level,
          name: level.name,
          rate,
          users: approvedApps.length,
        };
      })
      .sort((a, b) => a.level - b.level);

    return {
      totalUsers,
      verifiedUsers,
      pendingVerifications,
      rejectedVerifications,
      completionRates,
    };
  } catch (error: any) {
    console.error("Error in getKycAnalyticsData:", error);
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + error.message,
    });
  }
};
