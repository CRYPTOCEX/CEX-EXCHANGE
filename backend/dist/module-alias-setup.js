"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
let moduleAlias;
try {
    require("module-alias/register");
    moduleAlias = require("module-alias");
}
catch (error) {
    if ((error === null || error === void 0 ? void 0 : error.code) !== "MODULE_NOT_FOUND")
        throw error;
    const isWindows = process.platform === "win32";
    process.stderr.write("\n" +
        "  ✗ The backend cannot start: its dependencies are not installed.\n" +
        "\n" +
        `    Missing: module-alias (${error.message})\n` +
        "\n" +
        "  This is a declared production dependency, so the package.json is fine —\n" +
        "  node_modules is incomplete. That usually means an install was interrupted:\n" +
        "  pnpm aborts its node_modules purge when it has no TTY, which can leave the\n" +
        "  tree half-removed, and a later `pnpm install` trusts the lockfile and only\n" +
        "  fills gaps, so it cannot repair an inconsistent store.\n" +
        "\n" +
        "  Rebuild it from scratch:\n" +
        "\n" +
        "      pnpm reinstall\n" +
        "\n" +
        "  or by hand:\n" +
        "\n" +
        (isWindows
            ? "      rmdir /s /q node_modules backend\\node_modules frontend\\node_modules\n"
            : "      rm -rf node_modules backend/node_modules frontend/node_modules\n") +
        "      CI=true pnpm install\n" +
        "\n" +
        "  If that fails too, check for a full disk first:  df -h .\n" +
        "\n");
    process.exit(78);
}
const path_1 = __importDefault(require("path"));
const isProduction = process.env.NODE_ENV === "production";
const aliases = isProduction
    ? {
        "@b": path_1.default.resolve(__dirname, "src"),
        "@db": path_1.default.resolve(__dirname, "models"),
    }
    : {
        "@b": path_1.default.resolve(__dirname, "src"),
        "@db": path_1.default.resolve(__dirname, "models"),
    };
for (const alias in aliases) {
    moduleAlias.addAlias(alias, aliases[alias]);
}
