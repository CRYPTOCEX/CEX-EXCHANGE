import { jwtVerify, SignJWT } from "jose";
import crypto from "crypto";
import { makeUuid } from "./passwords";
import { RedisSingleton } from "./redis";

export const issuerKey = "platform";
const redis = RedisSingleton.getInstance();

const getExpiryInSeconds = (expiry: string): number => {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);

  switch (unit) {
    case "s":
      return value; // seconds
    case "m":
      return value * 60; // minutes
    case "h":
      return value * 60 * 60; // hours
    case "d":
      return value * 60 * 60 * 24; // days
    default:
      throw new Error(`Invalid expiry format: ${expiry}`);
  }
};

export async function generateTokens(user) {
  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  const csrfToken = crypto.randomBytes(24).toString("hex");
  const sessionId = crypto.randomBytes(24).toString("hex");
  const userSessionKey = `sessionId:${sessionId}`;

  const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
  const refreshTokenExpiryInSeconds = getExpiryInSeconds(JWT_REFRESH_EXPIRY);

  const userData = { refreshToken, csrfToken, sessionId, user };
  await redis.set(
    userSessionKey,
    JSON.stringify(userData),
    "EX",
    refreshTokenExpiryInSeconds
  );

  return { accessToken, refreshToken, csrfToken, sessionId };
}

export async function refreshTokens(user, sessionId) {
  const accessToken = await generateAccessToken(user);
  const csrfToken = crypto.randomBytes(24).toString("hex");

  // Assuming we fetch the existing session data to keep the refresh token and user info intact
  const userSessionKey = `sessionId:${sessionId}`;
  const sessionData = await redis.get(userSessionKey);

  if (!sessionData) {
    throw new Error("Session not found. Please re-authenticate.");
  }

  const session = JSON.parse(sessionData);
  session.csrfToken = csrfToken;
  session.accessToken = accessToken;

  // Update the session data in Redis with the new access token and updated CSRF token
  const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
  const refreshTokenExpiryInSeconds = getExpiryInSeconds(JWT_REFRESH_EXPIRY);
  await redis.set(
    userSessionKey,
    JSON.stringify(session),
    "EX",
    refreshTokenExpiryInSeconds
  ); // Extend session expiry

  return { accessToken, csrfToken };
}

// Generate Access Token
export const generateAccessToken = async (user: any): Promise<string> => {
  const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
  const jwtClaims = {
    sub: user,
    iss: issuerKey,
    jti: makeUuid(),
  };
  const APP_ACCESS_TOKEN_SECRET =
    process.env.APP_ACCESS_TOKEN_SECRET || "secret";
  return new SignJWT(jwtClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(new TextEncoder().encode(APP_ACCESS_TOKEN_SECRET));
};

// Verify Access Token
export const verifyAccessToken = async (token: string): Promise<any> => {
  if (!token) {
    return null;
  }

  const cookieToken = token.includes(" ") ? token.split(" ")[1] : token;
  const APP_ACCESS_TOKEN_SECRET =
    process.env.APP_ACCESS_TOKEN_SECRET || "secret";
  try {
    const { payload } = await jwtVerify(
      cookieToken,
      new TextEncoder().encode(APP_ACCESS_TOKEN_SECRET)
    );
    return payload;
  } catch (error) {
    if (error.message !== `"exp" claim timestamp check failed`) {
      console.error("JWT verification failed:", error.message);
    }
    return null;
  }
};

// Generate Refresh Token
export const generateRefreshToken = async (user: any): Promise<string> => {
  const jwtClaims = {
    sub: user,
    iss: issuerKey,
    jti: makeUuid(),
  };

  const APP_REFRESH_TOKEN_SECRET =
    process.env.APP_REFRESH_TOKEN_SECRET || "secret";
  const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";

  return new SignJWT(jwtClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRY) // Adjust the '14d' to your `JWT_REFRESH_EXPIRY`
    .sign(new TextEncoder().encode(APP_REFRESH_TOKEN_SECRET));
};

// Verify Refresh Token
export const verifyRefreshToken = async (token: string): Promise<any> => {
  if (!token) {
    return null;
  }

  const cookieToken = token.includes(" ") ? token.split(" ")[1] : token;

  const APP_REFRESH_TOKEN_SECRET =
    process.env.APP_REFRESH_TOKEN_SECRET || "secret";

  try {
    const { payload } = await jwtVerify(
      cookieToken,
      new TextEncoder().encode(APP_REFRESH_TOKEN_SECRET)
    );
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return null;
  }
};

export const generateEmailCode = async (userId: string): Promise<string> => {
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString(); // Generate a 6-digit code

  // Store code in Redis with a 5-minute expiration, using the code itself as the key
  await redis.set(`email-verification:${verificationCode}`, userId, "EX", 300);

  return verificationCode;
};

export const verifyEmailCode = async (code: string): Promise<string | null> => {
  const userId = await redis.get(`email-verification:${code}`);

  if (userId) {
    // Code is valid; delete it from Redis to prevent reuse
    await redis.del(`email-verification:${code}`);
    return userId;
  }

  // Code is invalid or expired
  return null;
};

// Generate Reset Token
export const generateResetToken = async (user: any): Promise<string> => {
  const jwtClaims = {
    sub: user,
    iss: issuerKey,
    jti: makeUuid(),
  };

  const APP_RESET_TOKEN_SECRET = process.env.APP_RESET_TOKEN_SECRET || "secret";
  const JWT_RESET_EXPIRY = process.env.JWT_RESET_EXPIRY || "1h";
  return new SignJWT(jwtClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_RESET_EXPIRY) // Adjust the '1h' to your `JWT_RESET_EXPIRY`
    .sign(new TextEncoder().encode(APP_RESET_TOKEN_SECRET));
};

// Verify Reset Token
export const verifyResetToken = async (token: string): Promise<any> => {
  if (!token) {
    return null;
  }

  const cookieToken = token.includes(" ") ? token.split(" ")[1] : token;
  try {
    const APP_RESET_TOKEN_SECRET =
      process.env.APP_RESET_TOKEN_SECRET || "secret";
    const { payload } = await jwtVerify(
      cookieToken,
      new TextEncoder().encode(APP_RESET_TOKEN_SECRET)
    );
    return payload;
  } catch (error) {
    console.error("Reset Token verification failed:", error.message);
    return null;
  }
};

export const generateEmailToken = async (user: any): Promise<string> => {
  const jwtClaims = {
    sub: user,
    iss: issuerKey,
    jti: makeUuid(),
  };

  const APP_RESET_TOKEN_SECRET = process.env.APP_RESET_TOKEN_SECRET || "secret";
  return new SignJWT(jwtClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // 24 hours for email token expiry
    .sign(new TextEncoder().encode(APP_RESET_TOKEN_SECRET)); // Using the same secret for email tokens for simplicity
};

// Generate CSRF Token
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

// Creates a new session for a user
export const createSession = async (
  userId: string,
  roleId: number,
  accessToken: string,
  csrfToken: string,
  refreshToken: string,
  ipAddress: string = ""
): Promise<{ sid: string; userId: string; roleId: number }> => {
  const sessionId = makeUuid(); // Generate a unique session ID
  const userSessionKey = `sessionId:${sessionId}`;
  const sessionData = JSON.stringify({
    userId,
    roleId,
    sid: makeUuid(),
    accessToken,
    csrfToken,
    refreshToken,
    ipAddress,
  });
  // Assuming the session's expiration time is also 14 days (in seconds)
  const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
  const refreshTokenExpiryInSeconds = getExpiryInSeconds(JWT_REFRESH_EXPIRY);
  await redis.set(
    userSessionKey,
    sessionData,
    "EX",
    refreshTokenExpiryInSeconds
  );

  return { sid: sessionId, userId, roleId };
};

// Delete a specific session for a user
export const deleteSession = async (sessionId: string): Promise<void> => {
  const userSessionKey = `sessionId:${sessionId}`;
  await redis.del(userSessionKey);
};
