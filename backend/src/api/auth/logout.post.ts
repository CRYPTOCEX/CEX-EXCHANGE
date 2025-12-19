// /server/api/auth/logout.post.ts

import { Request } from "@b/handler/Request";
import { deleteSession } from "@b/utils/token";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Logs out the current user",
  operationId: "logoutUser",
  tags: ["Auth"],
  description: "Logs out the current user and clears all session tokens",
  requiresAuth: true,
  logModule: "LOGOUT",
  logTitle: "User logout",
  responses: {
    200: {
      description: "User logged out successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    401: {
      description: "Unauthorized, no user to log out",
    },
  },
};

export default async (data: Request) => {
  const { ctx } = data as any;

  try {
    ctx?.step("Validating session");
    if (!data.cookies.sessionId) {
      ctx?.fail("No active session found");
      throw createError({
        statusCode: 401,
        message: "No active session found",
      });
    }

    ctx?.step("Deleting session");
    await deleteSession(data.cookies.sessionId);

    ctx?.step("Clearing user data");
    data.setUser(null);

    ctx?.success("User logged out successfully");
    return {
      message: "You have been logged out",
      cookies: {
        accessToken: "",
        refreshToken: "",
        sessionId: "",
        csrfToken: "",
      },
    };
  } catch (error) {
    ctx?.fail(error.message || "Logout failed");
    throw error;
  }
};
