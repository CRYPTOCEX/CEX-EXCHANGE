"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHbBotApiPath = isHbBotApiPath;
const BROWSER_PREFIXES = [
    "/api/hb/keys",
    "/api/hb/strategy",
    "/api/hb/setup",
    "/api/hb/console",
    "/api/hb/connector",
];
function isHbBotApiPath(path) {
    if (!path.startsWith("/api/hb/") && path !== "/api/hb")
        return false;
    return !BROWSER_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
