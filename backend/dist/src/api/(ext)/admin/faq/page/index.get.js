"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
async function getPagePaths(dir, basePath = "") {
    const entries = await promises_1.default.readdir(dir, { withFileTypes: true });
    const paths = [];
    for (const entry of entries) {
        const fullPath = path_1.default.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name.startsWith("_") ||
                entry.name.startsWith(".") ||
                entry.name === "api" ||
                entry.name === "admin" ||
                entry.name === "auth") {
                continue;
            }
            let routePart = entry.name;
            if (routePart.startsWith("[") && routePart.endsWith("]")) {
                if (routePart === "[locale]") {
                    routePart = "";
                }
                else {
                    routePart = routePart;
                }
            }
            const newBasePath = routePart ? `${basePath}/${routePart}` : basePath;
            paths.push(...await getPagePaths(fullPath, newBasePath));
        }
        else if (entry.name === "page.tsx" || entry.name === "page.jsx") {
            const routePath = basePath || "/";
            paths.push(routePath);
        }
    }
    return paths;
}
function transformToPageLinks(rawPaths) {
    return rawPaths
        .filter((p) => {
        return (!p.includes("/admin") &&
            !p.includes("/auth") &&
            !p.includes("/api") &&
            !p.includes("/error") &&
            !p.includes("/_") &&
            p !== "/404" &&
            p !== "/500");
    })
        .map((p) => {
        const segments = p.split("/").filter(Boolean);
        const group = segments[0] || "general";
        const name = segments.length > 0
            ? segments
                .join(" > ")
                .replace(/\[|\]/g, "")
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())
            : "Home";
        return {
            id: p,
            path: p,
            name,
            group: group.charAt(0).toUpperCase() + group.slice(1),
        };
    });
}
exports.metadata = {
    summary: "Get Available Page Links",
    description: "Automatically scans the Next.js app directory to retrieve a list of available page paths. Excludes admin, auth, utility, and error pages. Returns page paths with metadata for FAQ assignment.",
    operationId: "getFaqPageLinks",
    tags: ["Admin", "FAQ", "Pages"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Page links retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", description: "Unique identifier (same as path)" },
                                path: { type: "string", description: "Page path" },
                                name: { type: "string", description: "User-friendly page name" },
                                group: { type: "string", description: "Page group/section" },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "Get FAQ page links",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const isProduction = process.env.NODE_ENV === 'production';
    const appDir = isProduction
        ? path_1.default.join(process.cwd(), "frontend", "app")
        : path_1.default.join(process.cwd(), "..", "frontend", "app");
    let rawPaths = [];
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Scanning page directories");
        rawPaths = await getPagePaths(appDir);
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to scan page directories");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve page links",
        });
    }
    const pageLinks = transformToPageLinks(rawPaths);
    const uniqueLinks = Array.from(new Set(pageLinks.map((pl) => pl.path))).map((path) => pageLinks.find((pl) => pl.path === path));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Page links retrieved successfully");
    return uniqueLinks;
};
