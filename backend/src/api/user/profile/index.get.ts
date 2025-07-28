import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { getUserById } from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves the profile of the current user",
  description: "Fetches the profile of the currently authenticated user",
  operationId: "getProfile",
  tags: ["Auth"],
  requiresAuth: true,
  responses: {
    200: {
      description: "User profile retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string", description: "ID of the user" },
              email: { type: "string", description: "Email of the user" },
              firstName: {
                type: "string",
                description: "First name of the user",
              },
              lastName: {
                type: "string",
                description: "Last name of the user",
              },
              role: { type: "string", description: "Role of the user" },
              createdAt: {
                type: "string",
                format: "date-time",
                description: "Date and time when the user was created",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "Date and time when the user was last updated",
              },
              featureAccess: {
                type: "array",
                description:
                  "List of feature ids enabled for this user's KYC level",
                items: { type: "string" },
              },
            },
            required: [
              "id",
              "email",
              "firstName",
              "lastName",
              "role",
              "createdAt",
              "updatedAt",
              "featureAccess",
            ],
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("User"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Authentication required, Please log in.",
    });
  }
  return await getUserById(user.id);
};
