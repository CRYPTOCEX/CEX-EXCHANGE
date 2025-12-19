import { hashPassword, validatePassword } from "@b/utils/passwords";
import { models } from "@b/db";
import { handleReferralRegister } from "@b/utils/affiliate";
import { returnUserWithTokens, sendEmailVerificationToken, verifyRecaptcha } from "../utils";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

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
  logModule: "REGISTER",
  logTitle: "User registration",
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
  const { body, ctx } = data;
  let { firstName, lastName } = body;
  const { email, password, ref, recaptchaToken } = body;

  try {
    ctx?.step("Validating registration data");
    if (!email || !password || !firstName || !lastName) {
      ctx?.fail("Missing required registration fields");
      throw createError({
        statusCode: 400,
        message: "All fields are required",
      });
    }

    // Verify reCAPTCHA if enabled (check at runtime)
    if (isRecaptchaEnabled()) {
      ctx?.step("Verifying reCAPTCHA");
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
    ctx?.step("Sanitizing user input");
    firstName = sanitizeName(firstName);
    lastName = sanitizeName(lastName);

    if (!firstName || !lastName) {
      ctx?.fail("Invalid name(s) after sanitization");
      throw createError({ statusCode: 400, message: "Invalid name(s)" });
    }

    // Email uniqueness check
    ctx?.step(`Checking if email ${email} is available`);
    const existingUser = await models.user.findOne({ where: { email } });
    if (existingUser && existingUser.email) {
      if (
        !existingUser.emailVerified &&
        process.env.NEXT_PUBLIC_VERIFY_EMAIL_STATUS === "true"
      ) {
        ctx?.step("User exists but email not verified, resending verification");
        await sendEmailVerificationToken(existingUser.id, existingUser.email);
        ctx?.success("Verification email resent");
        return {
          message:
            "User already registered but email not verified. Verification email sent.",
        };
      }
      ctx?.fail("Email already in use");
      throw createError({ statusCode: 400, message: "Email already in use" });
    }

    // Password policy check
    ctx?.step("Validating password policy");
    if (!validatePassword(password)) {
      ctx?.fail("Password does not meet requirements");
      throw createError({ statusCode: 400, message: "Invalid password format" });
    }

    ctx?.step("Hashing password");
    const hashedPassword = await hashPassword(password);

    // Upsert roles as needed
    ctx?.step("Setting up user role");
    await models.role.upsert({ name: "User" });
    const roleName =
      process.env.NEXT_PUBLIC_DEMO_STATUS === "true" ? "Admin" : "User";
    await models.role.upsert({ name: roleName });

    // Fetch the role to get its ID
    const role = await models.role.findOne({ where: { name: roleName } });
    if (!role) throw createError({ statusCode: 500, message: "Role not found after upsert." });

    // Create the user (with sanitized names)
    ctx?.step("Creating new user account");
    const newUser = await models.user.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      roleId: role.id,
      emailVerified: false,
    });

    if (!newUser.email) {
      ctx?.fail("Error creating user");
      throw createError({
        statusCode: 500,
        message: "Error creating user",
      });
    }

    // Referral code
    if (ref) {
      ctx?.step(`Processing referral code: ${ref}`);
      try {
        await handleReferralRegister(ref, newUser.id);
      } catch (error) {
        ctx?.step("Failed to process referral code", "warn");
        logger.error("AUTH", "Error handling referral registration", error);
      }
    }

    // Email verification logic
    if (process.env.NEXT_PUBLIC_VERIFY_EMAIL_STATUS === "true") {
      ctx?.step("Sending email verification");
      await sendEmailVerificationToken(newUser.id, newUser.email);
      ctx?.success(`User ${email} registered, verification email sent`);
      return {
        message: "Registration successful, please verify your email",
      };
    } else {
      ctx?.step("Generating session tokens");
      const result = await returnUserWithTokens({
        user: newUser,
        message: "You have been registered successfully",
      });
      ctx?.success(`User ${email} registered and logged in`);
      return result;
    }
  } catch (error) {
    ctx?.fail(error.message || "Registration failed");
    throw error;
  }
};
