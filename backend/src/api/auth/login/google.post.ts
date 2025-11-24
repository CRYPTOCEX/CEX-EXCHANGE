import { OAuth2Client } from "google-auth-library";
import { models } from "@b/db";
import { serverErrorResponse } from "@b/utils/query";
import {
  returnUserWithTokens,
  userRegisterResponseSchema,
  userRegisterSchema,
} from "../utils";
import { createError } from "@b/utils/error";

// Constants
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const EXPECTED_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

const client = new OAuth2Client(CLIENT_ID);

export const metadata: OperationObject = {
  summary: "Logs in a user with Google",
  operationId: "loginUserWithGoogle",
  tags: ["Auth"],
  description: "Logs in a user using Google and returns a session token",
  requiresAuth: false,
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
      description: "User logged in successfully",
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

// Proper Google ID token verification, claim validation, and error handling
async function verifyGoogleIdToken(idToken: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) throw new Error("Missing payload in Google ID token");

    // Validate required claims
    if (!payload.iss || !EXPECTED_ISSUERS.includes(payload.iss)) {
      throw new Error("Invalid issuer in Google ID token");
    }
    if (!payload.aud || payload.aud !== CLIENT_ID) {
      throw new Error("Invalid audience in Google ID token");
    }
    if (!payload.exp || Date.now() / 1000 > payload.exp) {
      throw new Error("Google ID token has expired");
    }

    // Optionally: verify 'sub', 'email_verified', etc.
    if (!payload.sub || !payload.email) {
      throw new Error("Invalid Google ID token: missing user info");
    }
    // If you use nonce, validate payload.nonce here

    return payload;
  } catch (error: any) {
    throw new Error(`Google authentication failed: ${error.message}`);
  }
}

export default async (data: Handler) => {
  const { body } = data;
  const { token } = body;

  if (!token) {
    throw new Error("Missing Google token");
  }

  let payload;
  try {
    payload = await verifyGoogleIdToken(token);
  } catch (error) {
    throw createError({
      statusCode: 401,
      message: error.message || "Invalid Google token",
    });
  }

  const {
    sub: googleId,
    email,
    given_name: firstName,
    family_name: lastName,
  } = payload;

  if (!googleId || !email || !firstName || !lastName) {
    throw createError({
      statusCode: 400,
      message: "Incomplete user information from Google",
    });
  }

  // Find user by email
  const user = await models.user.findOne({ where: { email } });
  if (!user) {
    throw createError({
      statusCode: 404,
      message: "User not found. Please register first.",
    });
  }

  // Validate user status
  if (user.status === "BANNED") {
    throw createError({
      statusCode: 403,
      message: "Your account has been banned. Please contact support.",
    });
  }
  if (user.status === "SUSPENDED") {
    throw createError({
      statusCode: 403,
      message: "Your account is suspended. Please contact support.",
    });
  }
  if (user.status === "INACTIVE") {
    throw createError({
      statusCode: 403,
      message:
        "Your account is inactive. Please verify your email or contact support.",
    });
  }

  // Check or create provider user link
  const providerUser = await models.providerUser.findOne({
    where: { providerUserId: googleId, provider: "GOOGLE" },
  });

  if (!providerUser) {
    await models.providerUser.create({
      provider: "GOOGLE",
      providerUserId: googleId,
      userId: user.id,
    });
  }

  return await returnUserWithTokens({
    user,
    message: "You have been logged in successfully",
  });
};
