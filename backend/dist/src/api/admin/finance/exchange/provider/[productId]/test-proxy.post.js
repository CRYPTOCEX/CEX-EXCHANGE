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
exports.metadata = void 0;
const db_1 = require("@b/db");
const ccxt = __importStar(require("ccxt"));
const https_proxy_agent_1 = require("https-proxy-agent");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const console_1 = require("@b/utils/console");
function createProxyAgent(proxyUrl) {
    try {
        const url = new URL(proxyUrl);
        const protocol = url.protocol.toLowerCase();
        if (protocol === "socks4:" ||
            protocol === "socks5:" ||
            protocol === "socks:") {
            return new socks_proxy_agent_1.SocksProxyAgent(proxyUrl);
        }
        else if (protocol === "http:" || protocol === "https:") {
            return new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
        }
        else {
            return new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
        }
    }
    catch (error) {
        return null;
    }
}
exports.metadata = {
    summary: "Test proxy connection for an exchange",
    operationId: "testExchangeProxy",
    tags: ["Admin", "Exchanges"],
    parameters: [
        {
            index: 0,
            name: "productId",
            in: "path",
            description: "ID of the exchange to test proxy for",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "Proxy URL to test",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        proxyUrl: {
                            type: "string",
                            description: "Proxy URL to test (if not provided, uses saved proxy)",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Proxy test result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
    },
    requiresAuth: true,
    permission: "edit.exchange",
    logModule: "ADMIN_FIN",
    logTitle: "Test Exchange Proxy",
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { params, body, ctx } = data;
    const { productId } = params;
    const exchangeRecord = await db_1.models.exchange.findOne({
        where: { id: productId },
    });
    if (!exchangeRecord) {
        throw new Error("Exchange not found");
    }
    const proxyUrl = (body === null || body === void 0 ? void 0 : body.proxyUrl) || exchangeRecord.proxyUrl;
    const providerName = exchangeRecord.name;
    if (!proxyUrl) {
        return {
            status: false,
            message: "No proxy URL provided. Please enter a proxy URL to test.",
        };
    }
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Testing proxy connection for ${providerName}`);
    const agent = createProxyAgent(proxyUrl);
    if (!agent) {
        return {
            status: false,
            message: "Invalid proxy URL format. Please use http://, https://, socks4://, or socks5:// protocol.",
        };
    }
    let exchange = null;
    try {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Creating test exchange instance with proxy`);
        exchange = new ccxt.pro[providerName]({
            agent,
            timeout: 15000,
            enableRateLimit: true,
        });
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Fetching server time through proxy`);
        const serverTime = await exchange.fetchTime();
        await exchange.close();
        if (serverTime) {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Proxy connection successful`);
            return {
                status: true,
                message: `Proxy connection successful! Server time: ${new Date(serverTime).toISOString()}`,
            };
        }
        else {
            return {
                status: false,
                message: "Proxy connected but failed to get server response.",
            };
        }
    }
    catch (error) {
        if (exchange) {
            try {
                await exchange.close();
            }
            catch (e) {
            }
        }
        console_1.logger.error("EXCHANGE", `Proxy test failed for ${providerName}`, error);
        const errorMessage = error.message || "";
        if (errorMessage.includes("451") ||
            errorMessage.includes("restricted location") ||
            errorMessage.includes("Eligibility")) {
            return {
                status: false,
                message: "Proxy connected but the proxy server's location is also blocked by the exchange. Please use a proxy from an allowed region.",
            };
        }
        if (error.code === "ECONNREFUSED" ||
            error.code === "ETIMEDOUT" ||
            error.code === "ENOTFOUND") {
            return {
                status: false,
                message: "Failed to connect to proxy server. Please check the proxy URL and ensure the proxy server is running.",
            };
        }
        if (errorMessage.includes("407") || errorMessage.includes("Proxy Authentication")) {
            return {
                status: false,
                message: "Proxy authentication failed. Please check your proxy credentials.",
            };
        }
        return {
            status: false,
            message: `Proxy test failed: ${errorMessage || "Unknown error"}`,
        };
    }
};
