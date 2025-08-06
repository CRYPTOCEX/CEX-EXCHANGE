import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { verifyToken } from "@/lib/token/access-token";
import { MiddlewareFactory } from "../types/MiddlewareFactory";
import permissions from "@/middlewares/permissions.json";

const dev = process.env.NODE_ENV !== "production";
const frontendPort = process.env.NEXT_PUBLIC_FRONTEND_PORT || 3000;
const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;
const siteUrl = dev
  ? `http://localhost:${frontendPort}`
  : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost";
const apiUrl = dev
  ? `http://localhost:${backendPort}`
  : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost";

interface Role {
  name: string;
  permissions: string[];
}
interface RolesCache {
  [key: number]: Role;
}
let rolesCache: RolesCache | null = null;

async function fetchRolesAndPermissions() {
  try {
    const endpoint = `${apiUrl}/api/auth/role`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Prevent caching issues
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        rolesCache = data.reduce((acc: RolesCache, role: any) => {
          if (role && role.id && role.name && Array.isArray(role.permissions)) {
            acc[role.id] = {
              name: role.name,
              permissions: role.permissions.map((p: any) => p.name),
            };
          }
          return acc;
        }, {});
      } else {
        console.error("Invalid roles data format received");
        rolesCache = {};
      }
    } else {
      console.error(
        `Failed to fetch roles and permissions: ${response.status} ${response.statusText}`
      );
      rolesCache = {}; // Use empty object instead of null to prevent repeated fetches
    }
  } catch (error) {
    console.error("Error fetching roles and permissions:", error);
    rolesCache = {}; // Use empty object instead of null to prevent repeated fetches
  }
}

async function refreshToken(request: NextRequest) {
  try {
    const res = await fetch(`${apiUrl}/api/auth/session`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store", // Prevent caching issues
    });
    
    if (res.ok) {
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const accessToken = setCookie.match(/accessToken=([^;]+);/)?.[1];
        if (accessToken) {
          return accessToken;
        }
      }
    } else {
      console.error("Failed to refresh token:", res.status, res.statusText);
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
  return null;
}

const AUTH_PAGES = ["/auth"];
const defaultUserPath = process.env.NEXT_PUBLIC_DEFAULT_USER_PATH || "/user";
const isMaintenance =
  process.env.NEXT_PUBLIC_MAINTENANCE_STATUS === "true" || false;

// === PERMISSIONS MATCHER ===
function matchPermission(strippedPath: string): string | null {
  // 1. Exact match
  const matched = permissions.find((perm) => perm.path === strippedPath);
  if (matched) return matched.permission;

  // 2. Dynamic segments ([id], [slug], etc)
  for (const perm of permissions) {
    const regex = new RegExp(
      "^" + perm.path.replace(/\[.*?\]/g, "[^/]+") + "$"
    );
    if (regex.test(strippedPath)) return perm.permission;
  }
  return null;
}

async function hasPermission(roleId: number, strippedPath: string) {
  if (!rolesCache || Object.keys(rolesCache).length === 0) return false;
  const role = rolesCache[roleId];
  if (!role) return false;
  if (role.name === "Super Admin") return true;

  const requiredPermission = matchPermission(strippedPath);
  if (!requiredPermission) return true; // No permission required for this route
  return role.permissions.includes(requiredPermission);
}

export const authMiddleware: MiddlewareFactory =
  (next) => async (request: NextRequest, event: NextFetchEvent) => {
    const { pathname } = request.nextUrl;
    const locales = process.env.NEXT_PUBLIC_LANGUAGES?.split(", ") || [];
    // Extract locale from path, e.g. /en/admin
    let strippedPath = pathname;
    let currentLocale: string | null = null;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && locales.includes(segments[0])) {
      currentLocale = segments[0];
      strippedPath = "/" + segments.slice(1).join("/");
    }
    // Fetch roles if not loaded
    if (!rolesCache || Object.keys(rolesCache).length === 0) {
      await fetchRolesAndPermissions();
    }

    const accessToken = request.cookies.get("accessToken")?.value;
    let payload: any = null;
    let isTokenValid = false;

    if (accessToken) {
      const verified = await verifyToken(accessToken);
      if (verified) {
        payload = verified;
        isTokenValid = true;
      }
    }
    if (!isTokenValid) {
      const sessionId = request.cookies.get("sessionId")?.value;
      if (sessionId) {
        try {
          const newAccessToken = await refreshToken(request);
          if (newAccessToken) {
            const verified = await verifyToken(newAccessToken);
            if (verified) {
              payload = verified;
              isTokenValid = true;
              const response = NextResponse.next();
              response.cookies.set("accessToken", newAccessToken, {
                httpOnly: true,
                secure: !dev,
                sameSite: "lax",
                path: "/",
              });
              return response;
            }
          }
        } catch (error) {
          console.error("Error during token refresh:", error);
          // Continue with invalid token state
        }
      }
    }

    // --- Maintenance Mode ---
    if (isMaintenance && strippedPath !== "/maintenance") {
      if (!isTokenValid) {
        const url = request.nextUrl.clone();
        url.pathname = currentLocale
          ? `/${currentLocale}/maintenance`
          : `/maintenance`;
        return NextResponse.redirect(url);
      } else {
        const roleId = payload?.sub?.role;
        const userRole = roleId ? rolesCache?.[roleId] : null;
        if (
          !userRole ||
          (userRole.name !== "Super Admin" &&
            !userRole.permissions.includes("access.admin"))
        ) {
          const url = request.nextUrl.clone();
          url.pathname = currentLocale
            ? `/${currentLocale}/maintenance`
            : `/maintenance`;
          return NextResponse.redirect(url);
        }
      }
    }

    // If logged in and tries to access auth page, redirect to defaultUserPath
    if (
      isTokenValid &&
      AUTH_PAGES.some((page) => strippedPath.startsWith(page))
    ) {
      const returnUrl =
        request.nextUrl.searchParams.get("return") || defaultUserPath;
      const url = request.nextUrl.clone();
      url.pathname = currentLocale
        ? `/${currentLocale}${returnUrl}`
        : returnUrl;
      url.searchParams.delete("return");
      return NextResponse.redirect(url);
    }

    // Handle admin routes
    if (strippedPath.startsWith("/admin")) {
      const authParam = request.nextUrl.searchParams.get("auth");
      
      if (!isTokenValid) {
        // User not authenticated
        if (authParam !== "false") {
          const url = request.nextUrl.clone();
          url.searchParams.set("auth", "false");
          return NextResponse.redirect(url);
        }
        // If auth=false is already present, let the request continue to show the page with auth modal
      } else {
        // User is authenticated, check permissions
        const roleId = payload?.sub?.role;
        
        if (roleId && (await hasPermission(roleId, strippedPath))) {
          // User has permission, remove auth parameter if present and allow access
          if (authParam === "false") {
            const url = request.nextUrl.clone();
            url.searchParams.delete("auth");
            return NextResponse.redirect(url);
          }
          // User has access, continue normally
        } else {
          // User is authenticated but doesn't have admin permissions
          if (authParam !== "false") {
            const url = request.nextUrl.clone();
            url.searchParams.set("auth", "false");
            return NextResponse.redirect(url);
          }
          // If auth=false is already present, let the request continue to show no permission state
        }
      }
    }

    // For all other cases (e.g., not logged in to /user), just continue
    return next(request, event);
  };
