"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const https_1 = __importDefault(require("https"));
exports.metadata = {
    summary: "Fetch all patch notes from docs server",
    operationId: "getPatchNotes",
    tags: ["Admin", "System"],
    responses: {
        200: {
            description: "Patch notes fetched successfully",
        },
    },
    permission: "access.admin",
};
const DOCS_URL = "https://docs.mashdiv.com/patch-notes-data.json";
exports.default = async () => {
    try {
        const data = await fetchPatchNotes(DOCS_URL);
        return data;
    }
    catch (error) {
        return {
            buildTime: null,
            version: null,
            extensions: {},
        };
    }
};
function fetchPatchNotes(url) {
    return new Promise((resolve, reject) => {
        https_1.default
            .get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(new Error("Invalid JSON response"));
                }
            });
            res.on("error", reject);
        })
            .on("error", reject);
    });
}
