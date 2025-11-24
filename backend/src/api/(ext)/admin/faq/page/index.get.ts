import fs from "fs";
import path from "path";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get FAQ Page Links",
  description:
    "Automatically retrieves a list of page paths from the Next.js app folder, excluding admin, auth, utility, and error-page routes.",
  operationId: "getFAQPageLinks",
  tags: ["FAQ", "Admin"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Page links retrieved successfully",
      content: {
        "application/json": {
          schema: { type: "array", items: { type: "object" } },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "view.faq",
};

interface PageLink {
  id: string;
  path: string;
  name: string;
  group: string;
}

/**
 * Remove any segments that start with '[' or '(' so that dynamic or grouped routes are excluded.
 */
function sanitizePath(basePath: string): string {
  const segments = basePath.split("/");
  const filtered = segments.filter(
    (segment) => segment && !segment.startsWith("[") && !segment.startsWith("(")
  );
  return "/" + filtered.join("/");
}

function getPagePaths(dir: string, basePath: string = ""): string[] {
  let pages: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  // Check if the current folder contains a page file (e.g. page.tsx)
  const hasPage = items.some(
    (item) => !item.isDirectory() && /^page\.(tsx|jsx|js)$/.test(item.name)
  );
  if (hasPage) {
    pages.push(sanitizePath(basePath));
  }

  // Recurse into subdirectories
  for (const item of items) {
    if (item.isDirectory()) {
      // Exclude "admin" directories at the top-level
      if (basePath === "" && item.name.toLowerCase() === "admin") continue;

      const newBase = basePath === "" ? item.name : `${basePath}/${item.name}`;
      const subDir = path.join(dir, item.name);
      const subPages = getPagePaths(subDir, newBase);
      pages = pages.concat(subPages);
    }
  }

  return pages;
}

/**
 * Transform raw page paths (e.g. "/about") into PageLink objects
 * and skip admin/auth/utility/error-page routes.
 */
function transformToPageLinks(rawPaths: string[]): PageLink[] {
  const skipPrefixes = ["/admin", "/auth", "/utility", "/error-page"];
  const pageLinks: PageLink[] = [];

  for (const p of rawPaths) {
    // Skip paths starting with undesired prefixes
    if (skipPrefixes.some((prefix) => p.startsWith(prefix))) {
      continue;
    }

    // Provide a user-friendly name.
    let name = "";
    if (p === "/") {
      name = "Home";
    } else {
      // Remove the leading slash and split into segments.
      // Then join segments with " >> " as a delimiter.
      name = p
        .replace(/^\/+/, "")
        .split("/")
        .map((segment) =>
          segment
            .split("-")
            .map(
              (part) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join(" ")
        )
        .join(" » ");
    }

    // Extract the group as the first segment (or "home" if empty)
    const segments = p.replace(/^\/+/, "").split("/");
    const group = segments[0] || "home";

    pageLinks.push({
      id: p, // or generate a unique id if desired
      path: p,
      name: name || "Untitled",
      group, // the first segment of the path
    });
  }

  return pageLinks;
}

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Locate the Next.js app directory
  // Development: backend runs from /project/backend/, needs ".." to reach /project/frontend/
  // Production: backend runs from /public_html/, frontend is at /public_html/frontend/
  const isProduction = process.env.NODE_ENV === 'production';
  const appDir = isProduction
    ? path.join(process.cwd(), "frontend", "app")
    : path.join(process.cwd(), "..", "frontend", "app");
  let rawPaths: string[] = [];
  try {
    rawPaths = getPagePaths(appDir);
  } catch (err) {
    console.error("Error scanning pages directory:", err);
    throw createError({
      statusCode: 500,
      message: "Failed to retrieve page links",
    });
  }

  // Transform raw paths into structured page links, skipping certain prefixes
  const pageLinks = transformToPageLinks(rawPaths);

  // Remove duplicates if any, then return
  const uniqueLinks = Array.from(new Set(pageLinks.map((pl) => pl.path))).map(
    (path) => pageLinks.find((pl) => pl.path === path)!
  );

  return uniqueLinks;
};
