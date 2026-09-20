// lib/fetchers/user.ts
import { redisGet, redisSet } from "@/lib/redis";
import { siteUrl } from "@/lib/siteInfo";
import { cookies } from "next/headers";
import { verifyToken } from "../token/access-token";
import {
  classifyTransportError,
  transportErrorDetail,
} from "@/lib/errors/transport";

// A render must not hang on an unresponsive backend: without a deadline the
// page waits on the platform's default socket timeout while the user stares at
// nothing. Signed-out rendering (profile === null) is the correct degradation.
const PROFILE_TIMEOUT_MS = 5000;

export async function getUserProfile() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    if (!accessToken) {
      return null;
    }

    const verified = await verifyToken(accessToken);
    const userId = verified?.sub?.id;

    if (!userId) {
      return null;
    }

    // Skip cache for now to ensure permissions are always fresh
    // This fixes the issue where permissions might not be included in cached data
    /*
    if (userId) {
      try {
        const cachedProfile = await redisGet(`user:${userId}:profile`);
        if (cachedProfile) {
          return typeof cachedProfile === "string"
            ? JSON.parse(cachedProfile)
            : cachedProfile;
        }
      } catch (redisError) {
        console.warn("SSR: Redis cache error:", redisError);
        // Continue without cache
      }
    }
    */

    if (!siteUrl) {
      console.error("SSR: siteUrl is not configured");
      return null;
    }

    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    const apiUrl = `${siteUrl}/api/user/profile`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(apiUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieHeader,
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      console.warn(
        `SSR: Failed to fetch user profile: ${res.status} ${res.statusText}`
      );
      return null;
    }

    let profile;
    try {
      profile = await res.json();
    } catch (parseError) {
      console.warn("SSR: Failed to parse user profile response:", parseError);
      return null;
    }

    if (!profile || !profile.id) {
      return null;
    }

    // Disabled caching temporarily to ensure permissions are always included
    // The cache was causing issues with nested role.permissions data not being preserved
    /*
    // Try to cache the profile, but don't fail if Redis is unavailable
    try {
      await redisSet(
        `user:${profile.id}:profile`,
        JSON.stringify(profile),
        "EX",
        300
      );
    } catch (cacheError) {
      console.warn("SSR: Failed to cache user profile:", cacheError);
      // Continue without caching
    }
    */

    return profile;
  } catch (error) {
    // "fetch failed" on its own says nothing — the real reason lives on
    // error.cause. Name the endpoint too, so the line is actionable instead of
    // being one more anonymous SSR warning.
    const kind = classifyTransportError(error);
    if (kind === null) {
      console.error("SSR: getUserProfile failed:", error);
    } else {
      console.warn(
        `SSR: /api/user/profile unreachable — rendering signed-out (${transportErrorDetail(error)})`
      );
    }
    return null;
  }
}
