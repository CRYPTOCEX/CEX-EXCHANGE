// /server/api/auth/logout.post.ts

import { Request } from "@b/handler/Request";
import { deleteSession } from "@b/utils/token";

export const metadata: OperationObject = {
  summary: "Logs out the current user",
  operationId: "logoutUser",
  tags: ["Auth"],
  description: "Logs out the current user and clears all session tokens",
  requiresAuth: true,
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
  await deleteSession(data.cookies.sessionId);
  data.setUser(null);
  return {
    message: "You have been logged out",
    cookies: {
      accessToken: "",
      refreshToken: "",
      sessionId: "",
      csrfToken: "",
    },
  };
};
