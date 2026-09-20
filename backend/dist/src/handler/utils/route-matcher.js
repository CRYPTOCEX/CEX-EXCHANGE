"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRoutePath = parseRoutePath;
exports.createRoute = createRoute;
exports.addRouteToBuckets = addRouteToBuckets;
exports.findMatchingRoute = findMatchingRoute;
exports.extractPathParams = extractPathParams;
const regexparam_1 = require("regexparam");
function parseRoutePath(path) {
    const { keys, pattern } = (0, regexparam_1.parse)(path);
    return { keys: keys, pattern };
}
function createRoute(config) {
    const { keys, pattern } = parseRoutePath(config.path);
    return {
        handler: config.handler,
        method: config.method,
        path: config.path,
        regExp: pattern,
        keys,
    };
}
const registrationRank = new WeakMap();
let nextRank = 0;
function addRouteToBuckets(buckets, route) {
    registrationRank.set(route, nextRank++);
    const bucket = buckets.get(route.method);
    if (bucket) {
        bucket.push(route);
    }
    else {
        buckets.set(route.method, [route]);
    }
}
function findMatchingRoute(buckets, path, method) {
    var _a, _b;
    let hit;
    const exact = buckets.get(method);
    if (exact) {
        for (const route of exact) {
            if (route.regExp.test(path)) {
                hit = route;
                break;
            }
        }
    }
    const wildcard = method === "all" ? undefined : buckets.get("all");
    if (!wildcard || wildcard.length === 0)
        return hit;
    for (const route of wildcard) {
        if (route.regExp.test(path)) {
            if (!hit ||
                ((_a = registrationRank.get(route)) !== null && _a !== void 0 ? _a : 0) < ((_b = registrationRank.get(hit)) !== null && _b !== void 0 ? _b : 0)) {
                return route;
            }
            return hit;
        }
    }
    return hit;
}
function extractPathParams(url, keys, pattern) {
    const params = {};
    const match = pattern.exec(url);
    if (match) {
        keys.forEach((key, index) => {
            const value = match[index + 1];
            if (value !== undefined) {
                params[key] = decodeURIComponent(value);
            }
        });
    }
    return params;
}
