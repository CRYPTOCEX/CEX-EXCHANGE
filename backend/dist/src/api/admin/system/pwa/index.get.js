"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.metadata = {
    summary: "Get PWA manifest configuration",
    operationId: "getPwaManifest",
    tags: ["Admin", "System", "PWA"],
    responses: {
        200: {
            description: "PWA manifest configuration",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            manifest: { type: "object" },
                            icons: { type: "array" },
                            screenshots: { type: "array" },
                        },
                    },
                },
            },
        },
        500: { description: "Internal server error" },
    },
    permission: "view.settings",
    requiresAuth: true,
};
function getManifestPath() {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
        const possiblePaths = [
            path_1.default.join(process.cwd(), "frontend", "public", "manifest.json"),
            path_1.default.join(process.cwd(), "public", "manifest.json"),
            path_1.default.join(process.cwd(), "..", "frontend", "public", "manifest.json"),
        ];
        for (const testPath of possiblePaths) {
            if (fs_1.default.existsSync(testPath)) {
                return testPath;
            }
        }
        return possiblePaths[0];
    }
    return path_1.default.join(process.cwd(), "..", "frontend", "public", "manifest.json");
}
function getPublicDir() {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
        const possiblePaths = [
            path_1.default.join(process.cwd(), "frontend", "public"),
            path_1.default.join(process.cwd(), "public"),
            path_1.default.join(process.cwd(), "..", "frontend", "public"),
        ];
        for (const testPath of possiblePaths) {
            if (fs_1.default.existsSync(testPath)) {
                return testPath;
            }
        }
        return possiblePaths[0];
    }
    return path_1.default.join(process.cwd(), "..", "frontend", "public");
}
function getWebManifestPath() {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
        const possiblePaths = [
            path_1.default.join(process.cwd(), "frontend", "public", "site.webmanifest"),
            path_1.default.join(process.cwd(), "public", "site.webmanifest"),
            path_1.default.join(process.cwd(), "..", "frontend", "public", "site.webmanifest"),
        ];
        for (const testPath of possiblePaths) {
            if (fs_1.default.existsSync(testPath)) {
                return testPath;
            }
        }
        return possiblePaths[0];
    }
    return path_1.default.join(process.cwd(), "..", "frontend", "public", "site.webmanifest");
}
function getDefaultManifest() {
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "App";
    const siteDescription = process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "";
    return {
        name: siteName,
        short_name: siteName.substring(0, 12),
        description: siteDescription,
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#000000",
        scope: "/",
        lang: "en",
        dir: "ltr",
        categories: [],
        icons: [
            {
                src: "/img/logo/android-icon-36x36.webp",
                sizes: "36x36",
                type: "image/png",
                density: "0.75",
            },
            {
                src: "/img/logo/android-icon-48x48.webp",
                sizes: "48x48",
                type: "image/png",
                density: "1.0",
            },
            {
                src: "/img/logo/android-icon-72x72.webp",
                sizes: "72x72",
                type: "image/png",
                density: "1.5",
            },
            {
                src: "/img/logo/android-icon-96x96.webp",
                sizes: "96x96",
                type: "image/png",
                density: "2.0",
            },
            {
                src: "/img/logo/android-icon-144x144.webp",
                sizes: "144x144",
                type: "image/png",
                density: "3.0",
            },
            {
                src: "/img/logo/android-icon-192x192.webp",
                sizes: "192x192",
                type: "image/png",
                density: "4.0",
            },
            {
                src: "/img/logo/android-icon-256x256.webp",
                sizes: "256x256",
                type: "image/png",
                density: "5.0",
            },
            {
                src: "/img/logo/android-icon-384x384.webp",
                sizes: "384x384",
                type: "image/png",
                density: "6.0",
            },
            {
                src: "/img/logo/android-icon-512x512.webp",
                sizes: "512x512",
                type: "image/png",
                density: "8.0",
            },
            {
                src: "/img/logo/android-icon-512x512.webp",
                sizes: "512x512",
                type: "image/png",
                density: "8.0",
                purpose: "maskable",
            },
        ],
        screenshots: [],
        shortcuts: [
            {
                name: "Dashboard",
                url: "/",
                short_name: "Dashboard",
            },
        ],
        related_applications: [],
        prefer_related_applications: false,
    };
}
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading PWA manifest configuration");
        const manifestPath = getManifestPath();
        const webManifestPath = getWebManifestPath();
        const publicDir = getPublicDir();
        const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "App";
        const siteDescription = process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "";
        let manifest = {};
        let filesCreated = false;
        if (fs_1.default.existsSync(manifestPath)) {
            const content = await promises_1.default.readFile(manifestPath, "utf-8");
            manifest = JSON.parse(content);
            if (manifest.name === "App" || !manifest.name) {
                manifest.name = siteName;
            }
            if (manifest.short_name === "App" || !manifest.short_name) {
                manifest.short_name = siteName.substring(0, 12);
            }
            if (!manifest.description) {
                manifest.description = siteDescription;
            }
        }
        else {
            manifest = getDefaultManifest();
            const manifestDir = path_1.default.dirname(manifestPath);
            if (!fs_1.default.existsSync(manifestDir)) {
                await promises_1.default.mkdir(manifestDir, { recursive: true });
            }
            const manifestContent = JSON.stringify(manifest, null, 2);
            await promises_1.default.writeFile(manifestPath, manifestContent, "utf-8");
            await promises_1.default.writeFile(webManifestPath, manifestContent, "utf-8");
            console_1.logger.info("PWA", `Auto-generated manifest files at ${manifestPath}`);
            filesCreated = true;
        }
        if (!fs_1.default.existsSync(webManifestPath)) {
            const manifestContent = JSON.stringify(manifest, null, 2);
            await promises_1.default.writeFile(webManifestPath, manifestContent, "utf-8");
            console_1.logger.info("PWA", `Auto-generated site.webmanifest at ${webManifestPath}`);
            filesCreated = true;
        }
        const logoDir = path_1.default.join(publicDir, "img", "logo");
        let availableIcons = [];
        if (fs_1.default.existsSync(logoDir)) {
            const files = await promises_1.default.readdir(logoDir);
            availableIcons = files.filter((f) => (f.endsWith(".png") || f.endsWith(".webp")) &&
                (f.includes("android") || f.includes("icon") || f.includes("chrome")));
        }
        const screenshotDir = path_1.default.join(publicDir, "img", "screenshots");
        let availableScreenshots = [];
        if (fs_1.default.existsSync(screenshotDir)) {
            const files = await promises_1.default.readdir(screenshotDir);
            availableScreenshots = files.filter((f) => f.endsWith(".png") || f.endsWith(".webp") || f.endsWith(".jpg"));
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(filesCreated ? "PWA manifest files created" : "PWA manifest loaded successfully");
        return {
            manifest,
            availableIcons,
            availableScreenshots,
            manifestPath,
            filesCreated,
        };
    }
    catch (error) {
        console_1.logger.error("PWA", "Failed to read PWA manifest", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to read PWA manifest: ${error === null || error === void 0 ? void 0 : error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to read PWA manifest: ${error === null || error === void 0 ? void 0 : error.message}`,
        });
    }
};
