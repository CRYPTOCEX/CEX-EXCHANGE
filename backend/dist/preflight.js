"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const EXIT_UNSUPPORTED_RUNTIME = 78;
const ABI_TO_NODE_MAJOR = {
    "108": "18",
    "115": "20",
    "127": "22",
    "131": "23",
    "137": "24",
    "143": "25",
    "147": "26",
};
function uwsPackageDir() {
    try {
        return (0, path_1.dirname)(require.resolve("uWebSockets.js"));
    }
    catch (_a) {
        return null;
    }
}
function shippedAbis(dir) {
    const prefix = `uws_${process.platform}_${process.arch}_`;
    try {
        return (0, fs_1.readdirSync)(dir)
            .filter((f) => f.startsWith(prefix) && f.endsWith(".node"))
            .map((f) => f.slice(prefix.length, -".node".length))
            .sort((a, b) => Number(a) - Number(b));
    }
    catch (_a) {
        return [];
    }
}
function nodeMajors(abis) {
    return abis.map((abi) => { var _a; return (_a = ABI_TO_NODE_MAJOR[abi]) !== null && _a !== void 0 ? _a : `ABI ${abi}`; }).join(", ");
}
function checkNativeRuntime() {
    const dir = uwsPackageDir();
    if (!dir)
        return;
    const supported = shippedAbis(dir);
    if (supported.length === 0)
        return;
    if (supported.indexOf(process.versions.modules) !== -1)
        return;
    const rule = "═".repeat(74);
    process.stderr.write(`\n${rule}\n` +
        ` UNSUPPORTED NODE.JS VERSION — the backend cannot start\n` +
        `${rule}\n` +
        ` Running:   Node ${process.version}  (ABI ${process.versions.modules})\n` +
        ` Required:  Node ${nodeMajors(supported)}  (ABI ${supported.join(", ")})\n` +
        `\n` +
        ` uWebSockets.js ships prebuilt binaries only for the versions above, so\n` +
        ` this runtime has no uws_${process.platform}_${process.arch}_${process.versions.modules}.node to load.\n` +
        `\n` +
        ` Fix on this server:\n` +
        `   1. Install a supported Node, e.g.\n` +
        `        curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -\n` +
        `        sudo apt-get install -y nodejs\n` +
        `      (or:  nvm install 26 && nvm use 26 && nvm alias default 26)\n` +
        `\n` +
        `   2. Re-point PM2 at it. The daemon keeps whatever Node started it, so\n` +
        `      this is required even when \`node -v\` already looks right:\n` +
        `        pm2 kill && npm install -g pm2\n` +
        `\n` +
        `   3. Rebuild the native modules against the new ABI, then start:\n` +
        `        pnpm rebuild -r\n` +
        `        pnpm start\n` +
        `${rule}\n\n`);
    process.exit(EXIT_UNSUPPORTED_RUNTIME);
}
const REQUIRED_AT_BOOT = [
    "dotenv",
    "module-alias",
    "ioredis",
    "sequelize",
    "mysql2",
    "bullmq",
    "uWebSockets.js",
];
function checkRuntimeDependencies() {
    const missing = [];
    for (const name of REQUIRED_AT_BOOT) {
        try {
            require.resolve(name);
        }
        catch (_a) {
            missing.push(name);
        }
    }
    if (!missing.length)
        return;
    const isWindows = process.platform === "win32";
    const bar = "─".repeat(74);
    process.stderr.write(`\n${bar}\n` +
        `  ✗ The backend cannot start: ${missing.length} required package(s) are not installed.\n` +
        `\n` +
        missing.map((name) => `        ${name}\n`).join("") +
        `\n` +
        `  These are all declared production dependencies, so package.json is fine —\n` +
        `  node_modules is incomplete. That usually follows an interrupted install:\n` +
        `  pnpm aborts its node_modules purge when it has no TTY, which leaves the tree\n` +
        `  half-removed, and a later \`pnpm install\` trusts the lockfile and only fills\n` +
        `  gaps — so it cannot repair an inconsistent store.\n` +
        `\n` +
        `  Rebuild it from scratch:\n` +
        `\n` +
        `        pnpm reinstall\n` +
        `\n` +
        `  or by hand, from the repo root:\n` +
        `\n` +
        (isWindows
            ? `        rmdir /s /q node_modules backend\\node_modules frontend\\node_modules\n`
            : `        rm -rf node_modules backend/node_modules frontend/node_modules\n`) +
        `        CI=true pnpm install\n` +
        `\n` +
        `  Then check it took, from the repo root:\n` +
        `        node -e "require.resolve('dotenv')&&require.resolve('module-alias')&&console.log('ok')"\n` +
        `\n` +
        `  If the install fails again, check for a full disk first:  df -h .\n` +
        `${bar}\n\n`);
    process.exit(EXIT_UNSUPPORTED_RUNTIME);
}
try {
    checkNativeRuntime();
}
catch (_a) {
}
checkRuntimeDependencies();
