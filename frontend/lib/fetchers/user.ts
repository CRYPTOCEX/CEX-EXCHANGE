// lib/fetchers/user.ts
import { redisGet, redisSet } from "@/lib/redis";
import { siteUrl } from "@/lib/siteInfo";
import { cookies } from "next/headers";
import { verifyToken } from "../token/access-token";

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
    // TODO: Implement proper cache invalidation when user permissions change
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

    const allCookies = (await cookies()).getAll();
    const cookieHeader = allCookies
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    const apiUrl = `${siteUrl}/api/user/profile`;

    const res = await fetch(apiUrl, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

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
    console.warn(
      "SSR: Error in getUserProfile:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
