"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.relayOutbound = relayOutbound;
exports.hasRelayAudience = hasRelayAudience;
exports.announceRelayAudience = announceRelayAudience;
exports.startWsRelay = startWsRelay;
const settings_bus_1 = require("@b/utils/settings-bus");
const mode_1 = require("@b/cron/mode");
const console_1 = require("@b/utils/console");
const rust_owns_1 = require("@b/utils/rust-owns");
const WS_RELAY_CHANNEL = "ws:relay";
const WS_AUDIENCE_CHANNEL = "ws:relay:audience";
const AUDIENCE_REASSERT_MS = 20000;
const AUDIENCE_TRUST_MS = 3 * AUDIENCE_REASSERT_MS + 5000;
const MAX_RELAY_BYTES = 128 * 1024;
const RELAYED_ROUTES = new Set([
    "/api/admin/system/cron",
    "/api/ecosystem/deposit",
    "/api/dex/swap",
]);
const RELAYED_ROUTE_PREFIXES = ["/api/p2p/trade/"];
const SPLIT_RELAYED_ROUTES = new Set([
    "/api/ecosystem/order",
    "/api/futures/order",
    "/api/ecosystem/ticker",
    "/api/futures/ticker",
]);
const SPLIT_MARKET_ROUTES = new Set([
    "/api/ecosystem/market",
    "/api/futures/market",
]);
function isSplitRelayedFrame(frame) {
    var _a;
    var _b;
    const route = (_b = frame.r) !== null && _b !== void 0 ? _b : "";
    if (!route)
        return false;
    if (SPLIT_RELAYED_ROUTES.has(route))
        return true;
    if (SPLIT_MARKET_ROUTES.has(route))
        return ((_a = frame.p) === null || _a === void 0 ? void 0 : _a.type) === "ticker";
    return false;
}
const ANNOUNCED_ROUTES = new Set([
    ...RELAYED_ROUTES,
    ...SPLIT_RELAYED_ROUTES,
    ...SPLIT_MARKET_ROUTES,
]);
function isRelayedRoute(route) {
    if (!route)
        return false;
    if ((0, rust_owns_1.rustOwns)("ws.relay.all"))
        return true;
    if (RELAYED_ROUTES.has(route))
        return true;
    return RELAYED_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix));
}
let oversizeWarned = false;
let relayingInbound = false;
function shouldPublish(frame) {
    var _a, _b;
    const mode = (0, mode_1.cronMode)();
    if (mode === "inline")
        return false;
    if (mode === "only") {
        if (frame.k === "client")
            return true;
        if (isRelayedRoute((_a = frame.r) !== null && _a !== void 0 ? _a : ""))
            return true;
    }
    return isSplitRelayedFrame(frame) && hasRelayAudience((_b = frame.r) !== null && _b !== void 0 ? _b : "");
}
function relayOutbound(frame) {
    var _a;
    var _b;
    if (relayingInbound)
        return;
    if (!shouldPublish(frame))
        return;
    try {
        const size = (_b = (_a = JSON.stringify(frame.m)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        if (size > MAX_RELAY_BYTES) {
            if (!oversizeWarned) {
                oversizeWarned = true;
                console_1.logger.warn("WS_RELAY", `Dropping a ${size}-byte broadcast: over the ${MAX_RELAY_BYTES}-byte relay cap. ` +
                    `Cron-originated broadcasts are expected to be small; a payload this size ` +
                    `suggests a bulk push that should not be going through the relay.`);
            }
            return;
        }
    }
    catch (_c) {
        return;
    }
    void (0, settings_bus_1.publish)(WS_RELAY_CHANNEL, frame);
}
const remoteAudience = new Map();
const announcedAudience = new Map();
let localAudience = null;
function hasRelayAudience(route) {
    const bySource = remoteAudience.get(route);
    if (!bySource || bySource.size === 0)
        return false;
    const now = Date.now();
    for (const [source, until] of bySource) {
        if (until > now)
            return true;
        bySource.delete(source);
    }
    return false;
}
function announceRelayAudience(route) {
    if (!(0, mode_1.isCronDelegated)())
        return;
    if (!ANNOUNCED_ROUTES.has(route))
        return;
    const watching = localAudience ? localAudience(route) : false;
    if (announcedAudience.get(route) === watching)
        return;
    announcedAudience.set(route, watching);
    void (0, settings_bus_1.publish)(WS_AUDIENCE_CHANNEL, { r: route, w: watching });
}
function startAudienceAnnouncer() {
    const timer = setInterval(() => {
        for (const route of ANNOUNCED_ROUTES) {
            const watching = localAudience ? localAudience(route) : false;
            if (watching)
                void (0, settings_bus_1.publish)(WS_AUDIENCE_CHANNEL, { r: route, w: true });
            announcedAudience.set(route, watching);
        }
    }, AUDIENCE_REASSERT_MS);
    timer.unref();
}
function startAudienceListener() {
    (0, settings_bus_1.subscribe)(WS_AUDIENCE_CHANNEL, (payload) => {
        var _a;
        var _b;
        const route = typeof (payload === null || payload === void 0 ? void 0 : payload.r) === "string" ? payload.r : "";
        const source = String((_b = payload === null || payload === void 0 ? void 0 : payload.__src) !== null && _b !== void 0 ? _b : "");
        if (!route || !source || !ANNOUNCED_ROUTES.has(route))
            return;
        if (!(payload === null || payload === void 0 ? void 0 : payload.w)) {
            (_a = remoteAudience.get(route)) === null || _a === void 0 ? void 0 : _a.delete(source);
            return;
        }
        let bySource = remoteAudience.get(route);
        if (!bySource) {
            bySource = new Map();
            remoteAudience.set(route, bySource);
        }
        bySource.set(source, Date.now() + AUDIENCE_TRUST_MS);
    });
    console_1.logger.info("WS_RELAY", "Watching for socket presence announced by the other backend processes — a broadcast " +
        "is published only while somebody is actually connected there.");
}
function startWsRelay(deliver) {
    if ((0, mode_1.isCronOnlyProcess)()) {
        startAudienceListener();
        return;
    }
    if (!(0, mode_1.isCronDelegated)())
        return;
    localAudience = deliver.hasLocalClients;
    startAudienceAnnouncer();
    startAudienceListener();
    (0, settings_bus_1.subscribe)(WS_RELAY_CHANNEL, (payload) => {
        const frame = payload;
        try {
            relayingInbound = true;
            switch (frame.k) {
                case "route":
                    if (frame.r)
                        deliver.broadcastToRoute(frame.r, frame.m);
                    break;
                case "subscribed":
                    if (frame.r) {
                        deliver.broadcastToSubscribedClients(frame.r, frame.p, frame.m);
                    }
                    break;
                case "client":
                    if (frame.c)
                        deliver.sendToClient(frame.c, frame.m);
                    break;
            }
        }
        catch (error) {
            console_1.logger.error("WS_RELAY", "Failed to deliver a relayed broadcast", error);
        }
        finally {
            relayingInbound = false;
        }
    });
    console_1.logger.info("WS_RELAY", "Listening for WebSocket broadcasts relayed from the other backend processes.");
}
