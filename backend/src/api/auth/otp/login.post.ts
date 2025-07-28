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
  const { id, otp } = data.body;

  // Validate request parameters.
  validateOtpRequest(id, otp);

  const user = await getUserWith2FA(id);

  let secretToVerify = user.twoFactor.secret;
  let wasPlaintext = false;

  // Check and decrypt if needed
  if (isEncrypted(secretToVerify)) {
    try {
      secretToVerify = decrypt(secretToVerify);
    } catch (err) {
      throw new Error(
        "Could not decrypt 2FA secret. User data may be corrupted."
      );
    }
  } else {
    wasPlaintext = true;
  }

  // First, attempt to verify the OTP using the authenticator.
  if (!verifyOtp(secretToVerify, otp)) {
    // If OTP verification fails, try to consume a recovery code.
    await consumeRecoveryCode(user.twoFactor, otp);
  } else if (wasPlaintext) {
    // If it worked and it was plaintext, re-save as encrypted!
    const encrypted = encrypt(user.twoFactor.secret);
    await models.twoFactor.update(
      { secret: encrypted },
      { where: { id: user.twoFactor.id } }
    );
  }

  return await returnUserWithTokens({
    user,
    message: "You have been logged in successfully",
  });
};
