import { jwtVerify } from "jose";

function getTokenSecret(): string {
  const tokenSecret = process.env.APP_ACCESS_TOKEN_SECRET;
  if (!tokenSecret) {
    throw new Error("APP_ACCESS_TOKEN_SECRET is not set");
  }
  return tokenSecret;
}

export async function verifyToken(accessToken: string): Promise<any> {
  try {
    const tokenSecret = getTokenSecret();
    const result = await jwtVerify(
      accessToken,
      new TextEncoder().encode(tokenSecret),
      { clockTolerance: 300 }
    );
    return result.payload;
  } catch (error: any) {
    if (error.code === "ERR_JWT_EXPIRED") {
      console.warn("Token expired:", error.message);
    } else {
      console.error("Token verify error:", error.message);
    }
    return null;
  }
}
