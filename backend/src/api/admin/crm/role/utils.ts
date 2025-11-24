import { models } from "@b/db";
import { RedisSingleton } from "@b/utils/redis";
const redis = RedisSingleton.getInstance();

// Function to cache the roles
export async function cacheRoles() {
  try {
    const roles = await getRoles();
    await redis.set("roles", JSON.stringify(roles), "EX", 3600);
  } catch (error) {
    console.error("Redis error:", error);
  }
}

// Initialize the cache when the file is loaded
cacheRoles();

export async function getRoles(): Promise<roleAttributes[]> {
  const roles = await models.role.findAll({
    include: [
      {
        model: models.permission,
        as: "permissions",
        through: { attributes: [] },
      },
    ],
  });
  return roles.map((role) =>
    role.get({ plain: true })
  ) as unknown as roleAttributes[];
}

export async function getRole(id: string): Promise<roleAttributes | null> {
  const role = await models.role.findOne({
    where: { id },
    include: [
      {
        model: models.permission,
        as: "permissions",
        through: { attributes: [] },
      },
    ],
  });
  return role ? (role.get({ plain: true }) as unknown as roleAttributes) : null;
}

import { baseStringSchema } from "@b/utils/schema"; // Adjust the import path as necessary

// Define base components for the role schema
const id = baseStringSchema("ID of the role");
const name = baseStringSchema("Name of the role");

// Update permissions schema to expect an array of numbers
const permissions = {
  type: "array",
  items: {
    type: "string",
    description: "ID of the permission",
  },
};

// Base schema definition for roles
export const baseRoleSchema = {
  id,
  name,
  permissions,
};

// Schema for updating a role
export const roleUpdateSchema = {
  type: "object",
  properties: {
    name,
    permissions,
  },
  required: ["name", "permissions"],
};

// Schema for defining a new role
export const roleStoreSchema = {
  description: "Role created or updated successfully",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseRoleSchema,
      },
    },
  },
};
