import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  commonFields,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Create Admin Earning Record",
  operationId: "createAdminEarning",
  description:
    "Creates a new admin earning record for a staking pool. Admin earnings represent platform fees, early withdrawal fees, performance fees, or other earnings collected by the platform from the staking pool operations.",
  tags: ["Admin", "Staking", "Earnings"],
  requiresAuth: true,
  logModule: "ADMIN_STAKE",
  logTitle: "Add Admin Earning",
  requestBody: {
    description: "Admin earning data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            poolId: {
              type: "string",
              format: "uuid",
              description: "ID of the staking pool",
            },
            date: {
              type: "string",
              format: "date-time",
              description: "Date when the earning was generated",
            },
            amount: {
              type: "number",
              minimum: 0,
              description: "Amount of the earning",
            },
            isClaimed: {
              type: "boolean",
              description: "Whether the earning has been claimed",
              default: false,
            },
            type: {
              type: "string",
              enum: [
                "PLATFORM_FEE",
                "EARLY_WITHDRAWAL_FEE",
                "PERFORMANCE_FEE",
                "OTHER",
              ],
              description: "Type of admin earning",
            },
            status: {
              type: "string",
              description: "Status of the earning record",
            },
            currency: {
              type: "string",
              description: "Currency/token symbol of the earning",
            },
          },
          required: ["poolId", "date", "amount", "type", "status", "currency"],
        },
      },
    },
  },
  responses: {
    201: {
      description: "Admin earning record created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...commonFields,
              poolId: { type: "string", format: "uuid" },
              amount: { type: "number" },
              isClaimed: { type: "boolean" },
              type: {
                type: "string",
                enum: [
                  "PLATFORM_FEE",
                  "EARLY_WITHDRAWAL_FEE",
                  "PERFORMANCE_FEE",
                  "OTHER",
                ],
              },
              currency: { type: "string" },
              pool: {
                type: "object",
                description: "Associated staking pool details",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Staking Pool"),
    500: serverErrorResponse,
  },
  permission: "create.staking.earning",
};

export default async (data: { user?: any; body?: any; ctx?: any }) => {
  const { user, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  if (!body) {
    throw createError({ statusCode: 400, message: "Request body is required" });
  }

  const {
    poolId,
    date,
    amount,
    type,
    status,
    currency,
    isClaimed = false,
  } = body;

  if (
    !poolId ||
    !date ||
    amount === undefined ||
    !type ||
    !status ||
    !currency
  ) {
    throw createError({
      statusCode: 400,
      message: "poolId, date, amount, type, status, and currency are required",
    });
  }

  try {
    ctx?.step("Check if pool exists");
    // Check if the pool exists
    const pool = await models.stakingPool.findByPk(poolId);
    if (!pool) {
      throw createError({ statusCode: 404, message: "Pool not found" });
    }

    ctx?.step("Create admin earning record");
    // Create the admin earning record
    const adminEarning = await models.stakingAdminEarning.create({
      poolId,
      date,
      amount,
      isClaimed,
      type,
      status,
      currency,
      createdAt: new Date(),
    });

    ctx?.step("Fetch created earning with pool");
    // Fetch the created record with its pool
    const createdEarning = await models.stakingAdminEarning.findOne({
      where: { id: adminEarning.id },
      include: [
        {
          model: models.stakingPool,
          as: "pool",
        },
      ],
    });

    // Create a notification for the admin
    try {
      await createNotification({
        userId: user.id,
        relatedId: adminEarning.id,
        type: "system",
        title: "Admin Earning Added",
        message: `New admin earning of ${amount} ${currency} has been added for ${pool.name}.`,
        details: "The earning record has been created successfully.",
        link: `/admin/staking/earnings`,
        actions: [
          {
            label: "View Earnings",
            link: `/admin/staking/earnings`,
            primary: true,
          },
        ],
      }, ctx);
    } catch (notifErr) {
      console.error(
        "Failed to create notification for admin earning",
        notifErr
      );
      // Continue execution even if notification fails
    }

    ctx?.success("Admin earning created successfully");
    return createdEarning;
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error("Error creating admin earning:", error);
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
};
