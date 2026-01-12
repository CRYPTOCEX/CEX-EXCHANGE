import { jwtVerify } from "jose";

function getTokenSecret(): string {
  const tokenSecret = process.env.APP_ACCESS_TOKEN_SECRET;
  if (!tokenSecret) {
    throw new Error("APP_ACCESS_TOKEN_SECRET is not set");
  }
  return tokenSecret;
}

export async function verifyToken(accessToken: string): Promise<any> {
  // Return null early if no token provided
  if (!accessToken) {
    return null;
  }

  try {
    const tokenSecret = getTokenSecret();
    const result = await jwtVerify(
      accessToken,
      new TextEncoder().encode(tokenSecret),
      { clockTolerance: 300 }
    );
    return result.payload;
  } catch (error: any) {
    // Only log in development, and only for unexpected errors
    if (process.env.NODE_ENV === "development") {
      if (error.code === "ERR_JWT_EXPIRED") {
        // Token expired is normal - don't log as error
      } else if (error.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
        // Signature verification failed - could be old/invalid token, not an error
      } else if (error.code === "ERR_JWS_INVALID") {
        // Invalid JWS - malformed token, not an error
      } else {
        // Only log truly unexpected errors
        console.warn("Token verify issue:", error.code || error.message);
      }
    }
    return null;
  }
}
