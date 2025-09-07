import { models, sequelize } from "@b/db";
import { updateRecordResponses } from "@b/utils/query";
import { Op } from "sequelize";

export const metadata = {
  summary: "Updates the status of an Exchange",
  operationId: "updateExchangeStatus",
  tags: ["Admin", "Exchanges"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the exchange to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Exchange"),
  requiresAuth: true,
  permission: "edit.exchange",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;

  const transaction = await sequelize.transaction();

  try {
    // Deactivate all other exchanges if status is true
    if (status) {
      await models.exchange.update(
        { status: false },
        { where: { id: { [Op.ne]: id } }, transaction }
      );
    }

    // Update the status of the selected exchange
    await models.exchange.update({ status }, { where: { id }, transaction });

    await transaction.commit();

    return {
      statusCode: 200,
      body: {
        message: "Exchange status updated successfully",
      },
    };
  } catch (error) {
    await transaction.rollback();
    return {
      statusCode: 500,
      body: {
        message: "Failed to update exchange status",
        error: error.message,
      },
    };
  }
};
