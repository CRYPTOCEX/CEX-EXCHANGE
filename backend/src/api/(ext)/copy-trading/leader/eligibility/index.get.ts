// Check user's eligibility to become a copy trading leader
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { getCopyTradingSettings } from "../../utils";

export const metadata = {
  summary: "Check Leader Eligibility",
  description:
    "Checks if the current user is eligible to become a copy trading leader.",
  operationId: "checkCopyTradingLeaderEligibility",
  tags: ["Copy Trading", "Leaders"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Check leader eligibility",
  responses: {
    200: {
      description: "Eligibility check completed",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              isEligible: { type: "boolean" },
              requirements: {
                type: "object",
                properties: {
                  minTrades: {
                    type: "object",
                    properties: {
                      required: { type: "number" },
                      current: { type: "number" },
                      met: { type: "boolean" },
                    },
                  },
                  minWinRate: {
                    type: "object",
                    properties: {
                      required: { type: "number" },
                      current: { type: "number" },
                      met: { type: "boolean" },
                    },
                  },
                  accountAge: {
                    type: "object",
                    properties: {
                      required: { type: "number" },
                      current: { type: "number" },
                      met: { type: "boolean" },
                    },
                  },
                  kycVerified: {
                    type: "object",
                    properties: {
                      required: { type: "boolean" },
                      current: { type: "boolean" },
                      met: { type: "boolean" },
                    },
                  },
                },
              },
              existingApplication: { type: "object", nullable: true },
              blockedReason: { type: "string", nullable: true },
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
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching settings and existing application");
  const settings = await getCopyTradingSettings();

  // Check if user already has a leader application/profile
  const existingLeader = await models.copyTradingLeader.findOne({
    where: { userId: user.id },
  });

  let blockedReason: string | null = null;
  if (existingLeader) {
    switch (existingLeader.status) {
      case "ACTIVE":
        blockedReason = "You are already an active leader";
        break;
      case "PENDING":
        blockedReason = "Your leader application is pending review";
        break;
      case "SUSPENDED":
        blockedReason = "Your leader account has been suspended";
        break;
    }
  }

  ctx?.step("Checking user requirements");
  // Get user details
  const userRecord = await models.user.findByPk(user.id);
  if (!userRecord) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  // Calculate account age in days
  const accountCreatedAt = new Date(userRecord.createdAt);
  const now = new Date();
  const accountAgeDays = Math.floor((now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

  // Check KYC status
  const kycLevel = userRecord.kyc?.level || 0;
  const kycVerified = kycLevel >= 2;

  // Get user's trading history from ecosystem
  // This would query actual trading orders - simplified for now
  let userTrades = 0;
  let userWinRate = 0;

  try {
    // Try to get from ecosystem orders if available
    const orders = await models.exchangeOrder?.findAll({
      where: {
        userId: user.id,
        status: "CLOSED",
      },
      attributes: ["id", "profit"],
    });

    if (orders && orders.length > 0) {
      userTrades = orders.length;
      const winningOrders = orders.filter((o: any) => (o.profit || 0) > 0).length;
      userWinRate = (winningOrders / userTrades) * 100;
    }
  } catch {
    // Model might not exist, continue with defaults
  }

  // Build requirements check
  const requirements = {
    minTrades: {
      required: settings.minLeaderTrades,
      current: userTrades,
      met: userTrades >= settings.minLeaderTrades,
    },
    minWinRate: {
      required: settings.minLeaderWinRate,
      current: Math.round(userWinRate * 100) / 100,
      met: userWinRate >= settings.minLeaderWinRate || userTrades === 0, // Skip if no trades yet
    },
    accountAge: {
      required: settings.minLeaderAccountAge,
      current: accountAgeDays,
      met: accountAgeDays >= settings.minLeaderAccountAge,
    },
    kycVerified: {
      required: settings.requireKYC,
      current: kycVerified,
      met: !settings.requireKYC || kycVerified,
    },
  };

  // Check if all requirements are met
  const isEligible =
    !blockedReason &&
    requirements.minTrades.met &&
    requirements.minWinRate.met &&
    requirements.accountAge.met &&
    requirements.kycVerified.met;

  ctx?.success("Eligibility checked");
  return {
    isEligible,
    requirements,
    existingApplication: existingLeader
      ? {
          id: existingLeader.id,
          status: existingLeader.status,
          createdAt: existingLeader.createdAt,
          rejectionReason: existingLeader.rejectionReason,
        }
      : null,
    blockedReason,
  };
};
