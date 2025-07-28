import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "./../../utils/query";

export const metadata: OperationObject = {
  summary: "Retrieves session data by sessionId",
  operationId: "getSessionData",
  tags: ["Session"],
  description: "Retrieves session data from Redis by sessionId",
  requiresAuth: true,
  responses: {
    200: {
      description: "Session data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "string",
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Category"),
    500: serverErrorResponse,
  },
};

export default (data: any) => {
  const { user, cookies } = data;
  if (!user?.id) throw createError(401, "Unauthorized");
  return cookies.accessToken;
};
