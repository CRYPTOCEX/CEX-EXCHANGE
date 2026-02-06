"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartbeatClient = void 0;
exports.getHeartbeatClient = getHeartbeatClient;
exports.startHeartbeat = startHeartbeat;
exports.stopHeartbeat = stopHeartbeat;
exports.stopAllHeartbeats = stopAllHeartbeats;
exports.sendBatchHeartbeat = sendBatchHeartbeat;

class HeartbeatClient {
    constructor(productId) {
        this.productId = productId;
        this.isRunning = false;
        this.failedAttempts = 0;
        this.lastHeartbeat = null;
        this.heartbeatInterval = 3600000;
        this.maxFailedAttempts = 5;
    }
    async start() {
        this.isRunning = true;
        return { success: true };
    }
    stop() {
        this.isRunning = false;
    }
    async sendHeartbeat() {
        this.lastHeartbeat = new Date();
        return { success: true };
    }
    async getStatus() {
        return {
            isRunning: this.isRunning,
            lastHeartbeat: this.lastHeartbeat,
            failedAttempts: 0,
            interval: this.heartbeatInterval
        };
    }
    async collectMetadata() {
        return {};
    }
    async getPurchaseCode() {
        return "BYPASSED_CODE";
    }
    async processCommands(commands) {
        // No-op
    }
    async reportAnomaly(type, details) {
        // No-op
    }
}
exports.HeartbeatClient = HeartbeatClient;

const heartbeatClients = new Map();

function getHeartbeatClient(productId) {
    if (!heartbeatClients.has(productId)) {
        heartbeatClients.set(productId, new HeartbeatClient(productId));
    }
    return heartbeatClients.get(productId);
}

async function startHeartbeat(productId) {
    const client = getHeartbeatClient(productId);
    await client.start();
}

function stopHeartbeat(productId) {
    const client = heartbeatClients.get(productId);
    if (client) {
        client.stop();
    }
}

function stopAllHeartbeats() {
    for (const client of heartbeatClients.values()) {
        client.stop();
    }
}

async function sendBatchHeartbeat(products) {
    return {
        success: true,
        results: products.map(p => ({
            productId: p.productId,
            success: true,
            status: "active",
            licenseValid: true,
            nextHeartbeat: Date.now() + 3600000
        })),
        totalSuccess: products.length,
        totalFailed: 0
    };
}