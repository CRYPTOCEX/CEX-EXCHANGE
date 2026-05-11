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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const stream_1 = require("stream");
exports.metadata = { summary: "Download integration plugin",
    description: "Downloads the integration plugin as a ZIP file",
    operationId: "downloadIntegrationPlugin",
    tags: ["Gateway", "Integrations"],
    parameters: [
        { name: "pluginId",
            in: "path",
            required: true,
            description: "Plugin identifier (e.g., woocommerce)",
            schema: { type: "string" },
        },
    ],
    responses: { 200: { description: "Plugin ZIP file",
            content: { "application/zip": { schema: { type: "string", format: "binary" },
                },
            },
        },
        404: { description: "Plugin not found",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Download Integration",
    responseType: "binary",
};
const PLUGINS = { woocommerce: { name: "Bicrypto Payment Gateway for WooCommerce",
        folder: "bicrypto-payment-gateway-woocommerce",
        zipName: "bicrypto-payment-gateway-woocommerce.zip",
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { pluginId } = params;
    const plugin = PLUGINS[pluginId];
    if (!plugin) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Plugin not found",
        });
    }
    const pluginsDir = path.join(process.cwd(), "src", "api", "(ext)", "gateway", "integration", "plugins");
    const pluginDir = path.join(pluginsDir, plugin.folder);
    if (!fs.existsSync(pluginDir)) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Plugin files not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return new Promise((resolve, reject) => {
        const chunks = [];
        const passThrough = new stream_1.PassThrough();
        passThrough.on("data", (chunk) => {
            chunks.push(chunk);
        });
        passThrough.on("end", () => {
            const buffer = Buffer.concat(chunks);
            resolve({ data: buffer,
                headers: { "Content-Type": "application/zip",
                    "Content-Disposition": `attachment; filename="${plugin.zipName}"`,
                },
            });
        });
        passThrough.on("error", () => {
            reject((0, error_1.createError)({ statusCode: 500,
                message: "Failed to create plugin archive",
            }));
        });
        const archive = (0, archiver_1.default)("zip", { zlib: { level: 9 },
        });
        archive.on("error", () => {
            reject((0, error_1.createError)({ statusCode: 500,
                message: "Failed to create plugin archive",
            }));
        });
        archive.pipe(passThrough);
        archive.directory(pluginDir, plugin.folder);
        archive.finalize();
    });
};
