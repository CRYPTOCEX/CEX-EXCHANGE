import { returnUserWithTokens } from "../utils";
import {
  decrypt,
  encrypt,
  getUserWith2FA,
  isEncrypted,
  validateOtpRequest,
  verifyOtp,
  consumeRecoveryCode,
} from "./utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Verifies the OTP or recovery code for login",
  operationId: "verifyLoginOTP",
  tags: ["Auth"],
  description:
    "Verifies the OTP for login and returns a session token. If the OTP is invalid, the provided code is checked against the recovery codes.",
  requiresAuth: false,
  logModule: "2FA",
  logTitle: "2FA login verification",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID of the user",
            },
            otp: {
              type: "string",
              description: "OTP or recovery code to verify",
            },
          },
          required: ["id", "otp"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP or recovery code verified successfully, user logged in",
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
    400: { description: "Invalid request" },
    401: { description: "Unauthorized" },
  },
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { id, otp } = body;

  try {
    ctx?.step("Validating 2FA login request");
    // Validate request parameters.
    validateOtpRequest(id, otp);

    ctx?.step("Looking up user with 2FA");
    const user = await getUserWith2FA(id);

    let secretToVerify = user.twoFactor.secret;
    let wasPlaintext = false;

    ctx?.step("Checking secret encryption");
    // Check and decrypt if needed
    if (isEncrypted(secretToVerify)) {
      try {
        secretToVerify = decrypt(secretToVerify);
      } catch (err) {
        ctx?.fail("Failed to decrypt 2FA secret");
        throw new Error(
          "Could not decrypt 2FA secret. User data may be corrupted."
        );
      }
    } else {
      wasPlaintext = true;
      ctx?.step("Secret is in plaintext, will re-encrypt after verification", "warn");
    }

    ctx?.step("Verifying OTP code");
    // First, attempt to verify the OTP using the authenticator.
    if (!verifyOtp(secretToVerify, otp)) {
      ctx?.step("OTP verification failed, checking recovery codes");
      // If OTP verification fails, try to consume a recovery code.
      await consumeRecoveryCode(user.twoFactor, otp);
      ctx?.step("Recovery code consumed successfully");
    } else if (wasPlaintext) {
      ctx?.step("Re-encrypting plaintext secret");
      // If it worked and it was plaintext, re-save as encrypted!
      const encrypted = encrypt(user.twoFactor.secret);
      await models.twoFactor.update(
        { secret: encrypted },
        { where: { id: user.twoFactor.id } }
      );
    }

    ctx?.step("Generating session tokens");
    const result = await returnUserWithTokens({
      user,
      message: "You have been logged in successfully",
    });

    ctx?.success(`User ${user.email} logged in with 2FA`);
    return result;
  } catch (error) {
    ctx?.fail(error.message || "2FA login failed");
    throw error;
  }
};
