"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triedEnvPaths = exports.envLoadedFrom = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const envPaths = [
    path_1.default.resolve(process.cwd(), ".env"),
    path_1.default.resolve(__dirname, "../.env"),
    path_1.default.resolve(__dirname, ".env"),
    path_1.default.resolve(process.cwd(), "../.env"),
];
exports.envLoadedFrom = null;
exports.triedEnvPaths = envPaths;
for (const envPath of envPaths) {
    if (fs_1.default.existsSync(envPath)) {
        require("dotenv").config({ path: envPath, quiet: true });
        exports.envLoadedFrom = envPath;
        break;
    }
}
if (!exports.envLoadedFrom) {
    require("dotenv").config({ quiet: true });
}
