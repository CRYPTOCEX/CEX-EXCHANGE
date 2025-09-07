import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { authenticator } from "otplib";

import * as crypto from "crypto";

const ENC_ALGO = "aes-256-gcm";

// Get the secret from environment
const APP_VERIFY_TOKEN_SECRET = process.env.APP_VERIFY_TOKEN_SECRET || "";

// Handle different secret formats
let ENC_KEY: Buffer;

try {
  if (APP_VERIFY_TOKEN_SECRET.length === 64) {
    // 64 hex chars = 32 bytes (standard format)
    ENC_KEY = Buffer.from(APP_VERIFY_TOKEN_SECRET, "hex");
  } else if (APP_VERIFY_TOKEN_SECRET.length === 32) {
    // 32 chars = 32 bytes (direct string)
    ENC_KEY = Buffer.from(APP_VERIFY_TOKEN_SECRET, "utf8");
  } else if (APP_VERIFY_TOKEN_SECRET.length > 32) {
    // Longer string, take first 32 bytes
    ENC_KEY = Buffer.from(APP_VERIFY_TOKEN_SECRET.slice(0, 32), "utf8");
  } else {
    // Shorter string, pad to 32 bytes
    const padded = APP_VERIFY_TOKEN_SECRET.padEnd(32, "0");
    ENC_KEY = Buffer.from(padded, "utf8");
  }

  // Ensure we have exactly 32 bytes
  if (ENC_KEY.length !== 32) {
    // Fallback: create a 32-byte key from the available secret
    ENC_KEY = crypto.createHash("sha256").update(APP_VERIFY_TOKEN_SECRET || "fallback-secret").digest();
  }
} catch (error) {
  // If any error occurs, use a hash-based fallback
  console.warn("Failed to process APP_VERIFY_TOKEN_SECRET, using fallback key generation");
  ENC_KEY = crypto.createHash("sha256").update(APP_VERIFY_TOKEN_SECRET || "fallback-secret").digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12); // GCM standard nonce/iv
  const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(
    ":"
  );
}

export function decrypt(data: string): string {
  const [ivHex, tagHex, encHex] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export function isEncrypted(secret: string) {
  // Fast check: 3 colon-separated hex values, all of reasonable length
  if (typeof secret !== "string") return false;
  const parts = secret.split(":");
  return (
    parts.length === 3 && parts.every((part) => /^[0-9a-fA-F]{16,}$/.test(part))
  ); // tweak len if needed
}

// Helper function to get user by ID
export async function getUserById(userId: string) {
  const user = await models.user.findByPk(userId);
  if (!user) {
    throw createError({ statusCode: 400, message: "User not found" });
  }
  return user;
}

export async function getUserWith2FA(userId: string) {
  const user = await models.user.findOne({
    where: { id: userId },
    include: {
      model: models.twoFactor,
      as: "twoFactor",
    },
  });

  if (!user || !user.twoFactor?.secret) {
    throw createError({
      statusCode: 400,
      message: "User not found or 2FA not enabled",
    });
  }

  return user;
}

/**
 * Validates the OTP request body.
 * Throws an error if the required parameters are missing.
 */
export function validateOtpRequest(id: string, otp: string): void {
  if (!id || !otp) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameters: 'id' and 'otp'",
    });
  }
}

/**
 * Verifies an OTP using otplib.
 */
export function verifyOtp(secret: string, token: string): boolean {
  return authenticator.verify({ token, secret });
}

/**
 * Normalizes a recovery code by removing hyphens and converting to uppercase.
 */
export function normalizeCode(code: string): string {
  return code.replace(/-/g, "").toUpperCase();
}

/**
 * Checks if the provided recovery code is valid, consumes it by removing from the list,
 * and updates the twoFactor record in the database.
 * Accepts codes in the format XXXX-XXXX-XXXX or XXXXXXXXXXXX.
 */
export async function consumeRecoveryCode(
  twoFactor: any,
  providedCode: string
): Promise<void> {
  if (!twoFactor.recoveryCodes) {
    throw createError({ statusCode: 401, message: "Invalid OTP" });
  }

  let recoveryCodes: string[];
  try {
    recoveryCodes = JSON.parse(twoFactor.recoveryCodes);
  } catch (e) {
    throw createError({
      statusCode: 500,
      message: "Invalid recovery codes format",
    });
  }

  const normalizedInput = normalizeCode(providedCode);
  const codeIndex = recoveryCodes.findIndex(
    (code: string) => normalizeCode(code) === normalizedInput
  );

  if (codeIndex === -1) {
    throw createError({
      statusCode: 401,
      message: "Invalid OTP or recovery code",
    });
  }

  // Remove the used code and update the twoFactor record.
  recoveryCodes.splice(codeIndex, 1);
  await models.twoFactor.update(
    { recoveryCodes: JSON.stringify(recoveryCodes) },
    { where: { id: twoFactor.id } }
  );
}
