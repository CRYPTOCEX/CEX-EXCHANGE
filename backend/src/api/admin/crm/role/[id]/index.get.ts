import { models } from "@b/db";
import { baseRoleSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a specific role by ID",
  operationId: "getRole",
  tags: ["Admin", "CRM", "Role"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the role to retrieve",
      required: true,
      schema: {
        type: "number",
      },
    },
  ],
  permission: "view.role",
  responses: {
    200: {
      description: "Role retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseRoleSchema,
          },
        },
      },
    },
    404: {
      description: "Role not found",
    },
    500: {
      description: "Internal server error",
    },
  },
  requiresAuth: true,
};

export default async (data) => {
  const role = await models.role.findOne({
    where: {
      id: data.params.id,
    },
    include: [
      {
        model: models.permission,
        as: "permissions",
        through: { attributes: [] },
        attributes: ["id", "name"],
      },
    ],
  });

  // Check if a role was found
  if (!role) {
    throw new Error("Role not found");
  }

  // Convert the Sequelize model instance to a plain object
  return role.get({ plain: true });
};
