"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
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
    require("module-alias").addAlias(alias, aliases[alias]);
}
