"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Retrieves the email wrapper template HTML",
    operationId: "getEmailWrapperTemplate",
    tags: ["Admin", "Notifications"],
    permission: "view.notification.template",
    responses: {
        200: {
            description: "Email wrapper template retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            html: {
                                type: "string",
                                description: "The HTML content of the email wrapper template",
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: "Unauthorized, permission required to view notification",
        },
        404: {
            description: "Email wrapper template not found",
        },
        500: {
            description: "Internal server error",
        },
    },
    requiresAuth: true,
};
exports.default = async (_data) => {
    try {
        let templatePath;
        if (constants_1.isProduction) {
            templatePath = path_1.default.join(process.cwd(), "backend", "email", "templates", "generalTemplate.html");
        }
        else {
            templatePath = path_1.default.join(constants_1.baseUrl, "email", "templates", "generalTemplate.html");
        }
        const pathExists = async (p) => {
            try {
                await promises_1.default.access(p);
                return true;
            }
            catch (_a) {
                return false;
            }
        };
        if (!(await pathExists(templatePath))) {
            const alternativePaths = [
                path_1.default.join(process.cwd(), "email", "templates", "generalTemplate.html"),
                path_1.default.join(__dirname, "../../../../../email", "templates", "generalTemplate.html"),
                path_1.default.join(__dirname, "../../../../email", "templates", "generalTemplate.html"),
            ];
            const results = await Promise.all(alternativePaths.map(async (p) => ({ path: p, exists: await pathExists(p) })));
            const validPath = results.find(r => r.exists);
            if (validPath) {
                templatePath = validPath.path;
            }
        }
        const html = await promises_1.default.readFile(templatePath, "utf-8");
        return {
            html,
        };
    }
    catch (error) {
        if (error.code === "ENOENT") {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Email wrapper template not found",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to read email wrapper template",
        });
    }
};
