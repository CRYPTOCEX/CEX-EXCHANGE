"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.docsHost = docsHost;
exports.docsUrl = docsUrl;
exports.fetchDocsJson = fetchDocsJson;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const DEFAULT_HOST = "https://mashdiv.com";
function docsHost() {
    return (process.env.DOCS_HOST || DEFAULT_HOST).replace(/\/+$/, "");
}
function docsUrl(path, params) {
    const qs = params === null || params === void 0 ? void 0 : params.toString();
    return `${docsHost()}${path}${qs ? `?${qs}` : ""}`;
}
const TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const inflight = new Map();
async function fetchDocsJson(url) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < TTL_MS)
        return hit.value;
    const existing = inflight.get(url);
    if (existing)
        return existing;
    const p = request(url)
        .then((value) => {
        cache.set(url, { at: Date.now(), value });
        if (cache.size > 200) {
            const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
            if (oldest)
                cache.delete(oldest[0]);
        }
        return value;
    })
        .finally(() => inflight.delete(url));
    inflight.set(url, p);
    return p;
}
function request(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith("http://") ? http_1.default : https_1.default;
        const req = lib.get(url, { headers: { Accept: "application/json" }, timeout: 10000 }, (res) => {
            var _a;
            const status = (_a = res.statusCode) !== null && _a !== void 0 ? _a : 0;
            if (status >= 300 && status < 400 && res.headers.location) {
                res.resume();
                if (redirects >= 3)
                    return reject(new Error("too many redirects"));
                return resolve(request(new URL(res.headers.location, url).toString(), redirects + 1));
            }
            if (status !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${status}`));
            }
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(body));
                }
                catch (_a) {
                    reject(new Error("invalid JSON response"));
                }
            });
            res.on("error", reject);
        });
        req.on("timeout", () => {
            req.destroy(new Error("docs host timed out"));
        });
        req.on("error", reject);
    });
}
