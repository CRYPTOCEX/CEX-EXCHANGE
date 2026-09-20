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
require("./preflight");
require("./load-env");
require("./module-alias-setup");
const boot_guard_1 = require("./src/utils/dev/boot-guard");
const process_role_1 = require("./src/utils/process-role");
(0, boot_guard_1.installDevBootGuard)();
(0, process_role_1.applyTerminalTitle)();
const src_1 = require("./src");
const console_1 = require("./src/utils/console");
const ethers_log_guard_1 = require("./src/utils/console/ethers-log-guard");
(0, ethers_log_guard_1.installEthersLogThrottle)();
const port = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;
const startApp = async () => {
    try {
        const app = new src_1.MashServer();
        await app.startServer(Number(port));
        (0, boot_guard_1.disarmDevBootGuard)();
        if (process.env.NODE_ENV !== "production") {
            const { startHotReload } = await Promise.resolve().then(() => __importStar(require("./src/utils/dev/hot-reload")));
            startHotReload();
        }
    }
    catch (error) {
        console_1.console$.error("Failed to start server", error);
        console_1.logger.error("APP", "Failed to initialize app", error);
        (0, boot_guard_1.waitForFix)(error);
    }
};
startApp();
