import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get KYC Applications Analytics Data",
  description:
    "Fetches analytics data for KYC applications including total applications, pending, approved, rejected, additional info required, completion rate, and average processing time.",
  operationId: "getKycApplicationsAnalyticsData",
  tags: ["KYC", "Analytics"],
  responses: {
    200: {
      description: "KYC applications analytics data retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              total: { type: "number" },
              pending: { type: "number" },
              approved: { type: "number" },
              rejected: { type: "number" },
              infoRequired: { type: "number" },
              completionRate: { type: "number" },
              averageProcessingTime: { type: "number" },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error." },
  },
  requiresAuth: true,
  permission: "view.kyc.application",
};

export default async (_data: { query?: any }): Promise<any> => {
  try {
    // Fetch all KYC applications
    const applications = await models.kycApplication.findAll();

    // Compute basic stats
    const total = applications.length;
    const pending = applications.filter(
      (app: any) => app.status === "PENDING"
    ).length;
    const approved = applications.filter(
      (app: any) => app.status === "APPROVED"
    ).length;
    const rejected = applications.filter(
      (app: any) => app.status === "REJECTED"
    ).length;
    const infoRequired = applications.filter(
      (app: any) => app.status === "ADDITIONAL_INFO_REQUIRED"
    ).length;

    // Calculate completion rate as percentage
    const completionRate =
      total > 0 ? ((approved + rejected) / total) * 100 : 0;

    // Calculate average processing time (in hours) for reviewed applications
    const reviewedApps = applications.filter((app: any) => app.reviewedAt);
    const totalProcessingTime = reviewedApps.reduce((sum: number, app: any) => {
      const submittedAt = new Date(app.createdAt).getTime();
      const reviewedAt = new Date(app.reviewedAt).getTime();
      // Convert milliseconds to hours
      return sum + (reviewedAt - submittedAt) / (1000 * 60 * 60);
    }, 0);
    const averageProcessingTime =
      reviewedApps.length > 0 ? totalProcessingTime / reviewedApps.length : 0;

    return {
      total,
      pending,
      approved,
      rejected,
      infoRequired,
      completionRate,
      averageProcessingTime,
    };
  } catch (error: any) {
    console.error("Error in getKycApplicationsAnalyticsData:", error);
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + error.message,
    });
  }
};
