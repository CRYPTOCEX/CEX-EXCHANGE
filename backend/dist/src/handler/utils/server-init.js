"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageVersion = getPackageVersion;
exports.getApiRoutesPath = getApiRoutesPath;
exports.getAlternativeApiPaths = getAlternativeApiPaths;
exports.pathExistsAsync = pathExistsAsync;
const path = __importStar(require("path"));
const constants_1 = require("@b/utils/constants");
function getPackageVersion() {
    const fs = require("fs");
    const cwd = process.cwd();
    const cwdBasename = path.basename(cwd);
    const isBackendFolder = cwdBasename === "backend";
    const pathsToTry = [];
    if (constants_1.isProduction) {
        pathsToTry.push(path.join(__dirname, "../../../../package.json"), path.join(cwd, "package.json"));
    }
    else if (isBackendFolder) {
        pathsToTry.push(path.join(cwd, "..", "package.json"));
    }
    else {
        pathsToTry.push(path.join(cwd, "package.json"));
    }
    for (const pkgPath of pathsToTry) {
        try {
            const content = fs.readFileSync(pkgPath, "utf8");
            const pkg = JSON.parse(content);
            if (pkg.version)
                return pkg.version;
        }
        catch (_a) {
        }
    }
    return "unknown";
}
function getApiRoutesPath() {
    if (constants_1.isProduction) {
        return path.join(__dirname, "../../api");
    }
    const cwd = process.cwd();
    const cwdBasename = path.basename(cwd);
    if (cwdBasename === "backend") {
        return path.join(cwd, "src", "api");
    }
    return path.join(cwd, "backend", "src", "api");
}
function getAlternativeApiPaths() {
    const cwd = process.cwd();
    const cwdBasename = path.basename(cwd);
    const isBackendFolder = cwdBasename === "backend";
    if (constants_1.isProduction) {
        return [
            path.join(__dirname, "../../api"),
            path.join(cwd, "backend", "dist", "src", "api"),
            path.join(cwd, "dist", "src", "api"),
        ];
    }
    if (isBackendFolder) {
        return [
            path.join(cwd, "src", "api"),
            path.join(cwd, "dist", "src", "api"),
        ];
    }
    return [
        path.join(cwd, "backend", "src", "api"),
        path.join(cwd, "backend", "dist", "src", "api"),
    ];
}
async function pathExistsAsync(p) {
    const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
    try {
        await fs.access(p);
        return true;
    }
    catch (_a) {
        return false;
    }
}
