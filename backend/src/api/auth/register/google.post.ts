import { OAuth2Client } from "google-auth-library";
import { models } from "@b/db";
import { handleReferralRegister } from "@b/utils/affiliate";
import {
  returnUserWithTokens,
  userRegisterResponseSchema,
  userRegisterSchema,
} from "../utils";
import { serverErrorResponse } from "@b/utils/query";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export const metadata: OperationObject = {
  summary: "Registers a new user with Google",
  operationId: "registerUserWithGoogle",
  tags: ["Auth"],
  description: "Registers a new user using Google and returns a session token",
  requiresAuth: false,
  logModule: "REGISTER",
  logTitle: "Google registration",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: userRegisterSchema,
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
            properties: userRegisterResponseSchema,
          },
        },
      },
    },
    500: serverErrorResponse,
  },
};

async function verifyGoogleToken(token: string) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

async function fetchGoogleUserInfo(token: string) {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch user info from Google");
  }
  return response.json();
}

// Function to sanitize names by removing non-letter characters (supports Unicode, allows spaces)
function sanitizeName(name: string): string {
  return name.replace(/[^\p{L}\s]/gu, "");
}

// Function to validate names (supports Unicode, allows spaces)
function isValidName(name: string): boolean {
  return /^[\p{L}\s]+$/u.test(name);
}

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { token, ref } = body;

  try {
    ctx?.step("Validating Google token");
    if (!token) {
      ctx?.fail("Google token is required");
      throw createError({
        statusCode: 400,
        message: "Google token is required",
      });
    }

    ctx?.step("Verifying Google token");
    let payload;
    try {
      payload = await verifyGoogleToken(token);
    } catch (error) {
      ctx?.step("Trying alternative token verification");
      payload = await fetchGoogleUserInfo(token);
    }

    if (!payload) {
      ctx?.fail("Invalid Google token");
      throw createError({ statusCode: 400, message: "Invalid Google token" });
    }

    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
    } = payload;

    ctx?.step("Validating Google user data");
    if (!googleId || !email || !firstName || !lastName) {
      ctx?.fail("Incomplete user information from Google");
      throw createError({ statusCode: 400, message: "Incomplete user information from Google" });
    }

    ctx?.step("Sanitizing user names");
    // Sanitize and validate names
    const sanitizedFirstName = sanitizeName(firstName);
    const sanitizedLastName = sanitizeName(lastName);

    if (!isValidName(sanitizedFirstName) || !isValidName(sanitizedLastName)) {
      ctx?.fail("Invalid name format");
      throw createError({
        statusCode: 400,
        message: "First name and last name must only contain letters and spaces"
      });
    }

    ctx?.step(`Checking if user ${email} exists`);
    // Check if user already exists
    let user = await models.user.findOne({ where: { email } });

    let isNewUser = false;
    if (!user) {
      ctx?.step("Creating new user account");
      const roleName =
        process.env.NEXT_PUBLIC_DEMO_STATUS === "true" ? "Admin" : "User";
      await models.role.upsert({ name: roleName });

      // Fetch the role to get its ID
      const role = await models.role.findOne({ where: { name: roleName } });

      if (!role) throw createError({ statusCode: 500, message: "Role not found after upsert." });

      // Create the user with the roleId
      user = await models.user.create({
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        email,
        roleId: role.id,
        emailVerified: true,
      });

      ctx?.step("Creating Google provider link");
      // Create a provider_user entry
      await models.providerUser.create({
        provider: "GOOGLE",
        providerUserId: googleId,
        userId: user.id,
      });

      if (ref) {
        ctx?.step(`Processing referral code: ${ref}`);
        try {
          await handleReferralRegister(ref, user.id);
        } catch (error) {
          ctx?.step("Failed to process referral code", "warn");
          logger.error("AUTH", "Error handling referral registration", error);
        }
      }
      isNewUser = true;
    } else {
      ctx?.step("User exists, checking provider link");
      // Check if the user has a provider_user entry
      const providerUser = await models.providerUser.findOne({
        where: { providerUserId: googleId, provider: "GOOGLE" },
      });

      if (!providerUser) {
        ctx?.step("Creating Google provider link for existing user");
        // Create a provider_user entry
        await models.providerUser.create({
          provider: "GOOGLE",
          providerUserId: googleId,
          userId: user.id,
        });
      }
    }

    ctx?.step("Generating session tokens");
    const result = await returnUserWithTokens({
      user: user,
      message: isNewUser
        ? "You have been registered successfully"
        : "You have been logged in successfully",
    });

    ctx?.success(
      isNewUser
        ? `User ${email} registered with Google`
        : `User ${email} logged in with Google`
    );
    return result;
  } catch (error) {
    ctx?.fail(error.message || "Google registration/login failed");
    throw error;
  }
};
