"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
class AjvSingleton {
    constructor() { }
    static getInstance() {
        if (!AjvSingleton.instance) {
            const ajv = new ajv_1.default({
                allErrors: true,
                useDefaults: true,
                strict: "log",
                allowUnionTypes: true,
                keywords: ["placeholder", "example", "expectedFormat"],
            });
            (0, ajv_formats_1.default)(ajv);
            ajv.addFormat("uuid", {
                type: "string",
                validate: (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid),
            });
            ajv.addFormat("uri", {
                type: "string",
                validate: (uri) => {
                    return /^\/uploads\/.*/.test(uri) || isFullURI(uri);
                },
            });
            ajv.addFormat("date", {
                type: "string",
                validate: (date) => !isNaN(Date.parse(date)),
            });
            AjvSingleton.instance = ajv;
        }
        return AjvSingleton.instance;
    }
}
function isFullURI(uri) {
    try {
        new URL(uri);
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.default = AjvSingleton;
