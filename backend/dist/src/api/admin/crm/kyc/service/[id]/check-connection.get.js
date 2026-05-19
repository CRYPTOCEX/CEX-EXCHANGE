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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const crypto_1 = __importDefault(require("crypto"));
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Check Verification Service Connection",
    description: "Checks the connection status with a specific verification service.",
    operationId: "checkVerificationServiceConnection",
    tags: ["KYC", "Verification Services"],
    logModule: "ADMIN_CRM",
    logTitle: "Check verification service connection",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Verification service ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Connection check completed.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            connected: {
                                type: "boolean",
                                description: "Whether the connection is successful",
                            },
                            message: {
                                type: "string",
                                description: "Additional information about the connection status",
                            },
                        },
                    },
                },
            },
        },
        404: { description: "Verification service not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    try {
        const { id } = params;
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking connection to ${id}`);
        let result;
        if (id.startsWith("sumsub")) {
            result = await checkSumSubConnection();
        }
        else if (id.startsWith("gemini")) {
            result = await checkGeminiConnection(id);
        }
        else if (id.startsWith("deepseek")) {
            result = await checkDeepSeekConnection();
        }
        else {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Verification service not found",
            });
        }
        if (result.connected) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Connection successful");
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Connection failed: ${result.message}`);
        }
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to check connection");
        console_1.logger.error("KYC", "Error in checkVerificationServiceConnection", error);
        throw (0, error_1.createError)({
            statusCode: error.statusCode || 500,
            message: error.message || "Failed to check connection with verification service",
        });
    }
};
async function checkSumSubConnection() {
    const apiKey = process.env.SUMSUB_API_KEY;
    const apiSecret = process.env.SUMSUB_API_SECRET;
    if (!apiKey || !apiSecret) {
        return {
            connected: false,
            message: "Missing API credentials. Please configure SUMSUB_API_KEY and SUMSUB_API_SECRET.",
        };
    }
    try {
        const ts = Math.floor(Date.now() / 1000).toString();
        const signature = crypto_1.default
            .createHmac("sha256", apiSecret)
            .update(ts + "GET" + "/resources/checks")
            .digest("hex");
        const response = await fetch("https://api.sumsub.com/resources/checks", {
            method: "GET",
            headers: {
                "X-App-Token": apiKey,
                "X-App-Access-Sig": signature,
                "X-App-Access-Ts": ts,
                Accept: "application/json",
            },
        });
        if (response.ok) {
            return {
                connected: true,
                message: "Successfully connected to SumSub API",
            };
        }
        else {
            const errorData = (await response.json());
            return {
                connected: false,
                message: `SumSub connection failed: ${errorData.description || response.statusText}`,
            };
        }
    }
    catch (error) {
        return {
            connected: false,
            message: `SumSub connection error: ${error.message}`,
        };
    }
}
async function checkGeminiConnection(id) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            connected: false,
            message: "Missing API key. Please configure GEMINI_API_KEY.",
        };
    }
    try {
        const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require("@google/generative-ai")));
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: id });
        const generatedContent = await model.generateContent(["Test connection"]);
        if (generatedContent.response && generatedContent.response.text()) {
            return {
                connected: true,
                message: "Successfully connected to Gemini API",
            };
        }
        else {
            return {
                connected: false,
                message: "Gemini connection failed: No response received",
            };
        }
    }
    catch (error) {
        let errorMessage = "Gemini connection error";
        if (error.status === 401) {
            errorMessage = "Authentication failed - invalid API key";
        }
        else if (error.status === 429) {
            errorMessage = "Rate limit exceeded";
        }
        else if (error.status === 503) {
            errorMessage = "Gemini service unavailable";
        }
        else {
            errorMessage = `Gemini connection error: ${error.message}`;
        }
        return {
            connected: false,
            message: errorMessage,
        };
    }
}
async function checkDeepSeekConnection() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return {
            connected: false,
            message: "Missing API key. Please configure DEEPSEEK_API_KEY.",
        };
    }
    try {
        const response = await fetch("https://api.deepseek.com/v1/models", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
        });
        if (response.ok) {
            return {
                connected: true,
                message: "Successfully connected to DeepSeek API",
            };
        }
        else {
            const errorData = await response.text();
            let errorMessage = "DeepSeek connection failed";
            if (response.status === 401) {
                errorMessage = "Authentication failed - invalid API key";
            }
            else if (response.status === 429) {
                return {
                    connected: true,
                    message: "API key is valid (rate limit reached, but connection successful)",
                };
            }
            else if (response.status === 503) {
                errorMessage = "DeepSeek service unavailable";
            }
            else {
                errorMessage = `DeepSeek connection failed: ${response.statusText}`;
            }
            return {
                connected: false,
                message: errorMessage,
            };
        }
    }
    catch (error) {
        return {
            connected: false,
            message: `DeepSeek connection error: ${error.message}`,
        };
    }
}
