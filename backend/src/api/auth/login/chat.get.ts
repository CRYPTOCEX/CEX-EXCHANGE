// /server/api/auth/loginChat.get.ts

import { hashPassword, validatePassword } from "@b/utils/passwords";
import { models } from "@b/db";
import {
  createSessionAndReturnResponse,
  createUser,
  getOrCreateUserRole,
  updateUser,
  validateEmail,
} from "../utils";

export const metadata: OperationObject = {
  summary: "Logs in a user to the chat service",
  description: "Logs in a user to the chat service and returns a session token",
  operationId: "loginUserChat",
  tags: ["Auth"],
  requiresAuth: false,
  parameters: [
    {
      in: "query",
      name: "email",
      required: true,
      schema: {
        type: "string",
        format: "email",
      },
      description: "Email of the user",
    },
    {
      in: "query",
      name: "password",
      required: true,
      schema: {
        type: "string",
      },
      description: "Password of the user",
    },
    {
      in: "query",
      name: "firstName",
      required: true,
      schema: {
        type: "string",
      },
      description: "First name of the user",
    },
    {
      in: "query",
      name: "lastName",
      required: true,
      schema: {
        type: "string",
      },
      description: "Last name of the user",
    },
  ],
  responses: {
    200: {
      description: "User logged into chat successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              cookies: {
                type: "object",
                properties: {
                  accessToken: {
                    type: "string",
                    description: "Access token",
                  },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request (e.g., missing or invalid email/password)",
    },
    401: {
      description: "Unauthorized (incorrect credentials)",
    },
  },
};

export default (data: Handler) => {
  const { query } = data;
  const { email, password, firstName, lastName } = query;
  return loginUserChat(email, password, firstName, lastName);
};

export const loginUserChat = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string
) => {
  // Validate input
  if (!validateEmail(email) || !validatePassword(password)) {
    throw new Error("Invalid email or password");
  }

  // Hash password
  const errorOrHashedPassword = await hashPassword(password);
  const hashedPassword = errorOrHashedPassword as string;

  const existingUser = await models.user.findOne({
    where: { email },
    include: { model: models.twoFactor, as: "twoFactor" },
  });

  if (!existingUser) {
    const role = await getOrCreateUserRole();
    const newUser = await createUser({
      firstName,
      lastName,
      email,
      hashedPassword,
      role,
    });
    return await createSessionAndReturnResponse(newUser);
  } else {
    // Validate user status
    if (existingUser.status === "BANNED") {
      throw new Error("Your account has been banned. Please contact support.");
    }

    if (existingUser.status === "SUSPENDED") {
      throw new Error("Your account is suspended. Please contact support.");
    }

    if (existingUser.status === "INACTIVE") {
      throw new Error(
        "Your account is inactive. Please verify your email or contact support."
      );
    }

    // Update user details
    await updateUser(existingUser.id, {
      firstName,
      lastName,
      hashedPassword,
    });
    return await createSessionAndReturnResponse(existingUser);
  }
};
