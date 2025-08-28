import { hashPassword, validatePassword } from "@b/utils/passwords";
import { models } from "@b/db";
import { handleReferralRegister } from "@b/utils/affiliate";
import { returnUserWithTokens, sendEmailVerificationToken, verifyRecaptcha } from "../utils";
import { createError } from "@b/utils/error";

// Check reCAPTCHA status - use a function to check at runtime
const isRecaptchaEnabled = () => 
  process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_STATUS === "true";

// For backward compatibility, keep the const but use the function
const recaptchaEnabled = isRecaptchaEnabled();

// --- Helper: Sanitize Names ---
/**
 * Sanitizes user-provided names for backend storage:
 * - Removes all HTML tags
 * - Removes dangerous characters
 * - Only allows letters (unicode), spaces, hyphens, apostrophes, periods
 * - Trims and limits to 64 chars
 */
function sanitizeName(name: string): string {
  if (typeof name !== "string") return "";
  // Remove HTML tags
  let sanitized = name.replace(/<.*?>/g, "");
  // Remove dangerous characters
  sanitized = sanitized.replace(/[&<>"'/\\;:]/g, "");
  // Allow only unicode letters, spaces, hyphens, apostrophes, and dots
  sanitized = sanitized.replace(/[^\p{L} \-'.]/gu, "");
  // Trim and limit length
  sanitized = sanitized.trim().slice(0, 64);
  return sanitized;
}

export const metadata: OperationObject = {
  summary: "Registers a new user",
  operationId: "registerUser",
  tags: ["Auth"],
  description: "Registers a new user and returns a session token",
  requiresAuth: false,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            firstName: {
              type: "string",
              description: "First name of the user",
            },
            lastName: {
              type: "string",
              description: "Last name of the user",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email of the user",
            },
            password: {
              type: "string",
              description: "Password of the user",
            },
            ref: {
              type: "string",
              description: "Referral code",
            },
            recaptchaToken: {
              type: "string",
              description: "Recaptcha token if enabled",
              nullable: true, // Always make it nullable in schema
            },
          },
          required: [
            "firstName",
            "lastName",
            "email",
            "password",
            // Don't require it in schema, validate in handler
          ],
        },
      },
    },
  },
  responses: {
    200: {
      description: "User registered successfully",
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
                  sessionId: {
                    type: "string",
                    description: "Session ID",
                  },
                  csrfToken: {
                    type: "string",
                    description: "CSRF token",
                  },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request (e.g., email already in use)",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Error message",
              },
            },
          },
        },
      },
    },
  },
};

export default async (data: Handler) => {
  const { body } = data;
  let { firstName, lastName } = body;
  const { email, password, ref, recaptchaToken } = body;

  // Verify reCAPTCHA if enabled (check at runtime)
  if (isRecaptchaEnabled()) {
    if (!recaptchaToken) {
      throw createError({
        statusCode: 400,
        message: "reCAPTCHA token is required",
      });
    }
    
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      throw createError({
        statusCode: 400,
        message: "reCAPTCHA verification failed",
      });
    }
  }

  // --- Input Sanitization ---
  firstName = sanitizeName(firstName);
  lastName = sanitizeName(lastName);

  if (!firstName || !lastName) {
    throw createError({ statusCode: 400, message: "Invalid name(s)" });
  }

  // Email uniqueness check
  const existingUser = await models.user.findOne({ where: { email } });
  if (existingUser && existingUser.email) {
    if (
      !existingUser.emailVerified &&
      process.env.NEXT_PUBLIC_VERIFY_EMAIL_STATUS === "true"
    ) {
      await sendEmailVerificationToken(existingUser.id, existingUser.email);
      return {
        message:
          "User already registered but email not verified. Verification email sent.",
      };
    }
    throw createError({ statusCode: 400, message: "Email already in use" });
  }

  // Password policy check
  if (!validatePassword(password)) {
    throw createError({ statusCode: 400, message: "Invalid password format" });
  }

  const hashedPassword = await hashPassword(password);

  // Upsert roles as needed
  await models.role.upsert({ name: "User" });
  const roleName =
    process.env.NEXT_PUBLIC_DEMO_STATUS === "true" ? "Admin" : "User";
  await models.role.upsert({ name: roleName });

  // Fetch the role to get its ID
  const role = await models.role.findOne({ where: { name: roleName } });
  if (!role) throw createError({ statusCode: 500, message: "Role not found after upsert." });

  // Create the user (with sanitized names)
  const newUser = await models.user.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    roleId: role.id,
    emailVerified: false,
  });

  if (!newUser.email) {
    throw createError({
      statusCode: 500,
      message: "Error creating user",
    });
  }

  // Referral code
  try {
    if (ref) await handleReferralRegister(ref, newUser.id);
  } catch (error) {
    console.error("Error handling referral registration:", error);
  }

  // Email verification logic
  if (process.env.NEXT_PUBLIC_VERIFY_EMAIL_STATUS === "true") {
    await sendEmailVerificationToken(newUser.id, newUser.email);
    return {
      message: "Registration successful, please verify your email",
    };
  } else {
    return await returnUserWithTokens({
      user: newUser,
      message: "You have been registered successfully",
    });
  }
};
