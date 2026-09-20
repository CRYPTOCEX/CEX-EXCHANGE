"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rssAdapter = void 0;
const xml2js_1 = require("xml2js");
const http_1 = require("./http");
const constants_1 = require("./constants");
const coerce_1 = require("./coerce");
const normalise_1 = require("./normalise");
const VENDOR = "RSS";
const RSS_MAX_BYTES = 4 * 1024 * 1024;
function declaresEntities(xml) {
    return /<!ENTITY/i.test(xml) || /<!DOCTYPE[^>[]*\[/i.test(xml);
}
function text(node) {
    var _a;
    if (node === null || node === undefined)
        return "";
    if (typeof node === "string")
        return node;
    if (Array.isArray(node))
        return text(node[0]);
    if (typeof node === "object" && "_" in node)
        return String((_a = node._) !== null && _a !== void 0 ? _a : "");
    return "";
}
function linkOf(entry) {
    var _a;
    var _b, _c;
    const rss = text(entry === null || entry === void 0 ? void 0 : entry.link);
    if (rss)
        return rss;
    const links = Array.isArray(entry === null || entry === void 0 ? void 0 : entry.link) ? entry.link : [];
    const alternate = (_b = links.find((l) => { var _a; var _b; return ((_b = (_a = l === null || l === void 0 ? void 0 : l.$) === null || _a === void 0 ? void 0 : _a.rel) !== null && _b !== void 0 ? _b : "alternate") === "alternate"; })) !== null && _b !== void 0 ? _b : links[0];
    return String((_c = (_a = alternate === null || alternate === void 0 ? void 0 : alternate.$) === null || _a === void 0 ? void 0 : _a.href) !== null && _c !== void 0 ? _c : "");
}
function imageOf(entry) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const candidates = [
        (_c = (_b = (_a = entry === null || entry === void 0 ? void 0 : entry["media:thumbnail"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.$) === null || _c === void 0 ? void 0 : _c.url,
        (_f = (_e = (_d = entry === null || entry === void 0 ? void 0 : entry["media:content"]) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.$) === null || _f === void 0 ? void 0 : _f.url,
        ((_l = (_k = (_j = (_h = (_g = entry === null || entry === void 0 ? void 0 : entry.enclosure) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.$) === null || _j === void 0 ? void 0 : _j.type) === null || _k === void 0 ? void 0 : _k.startsWith) === null || _l === void 0 ? void 0 : _l.call(_k, "image/"))
            ? entry.enclosure[0].$.url
            : undefined,
        text(entry === null || entry === void 0 ? void 0 : entry["itunes:image"]),
    ];
    for (const candidate of candidates) {
        const url = (0, coerce_1.safeHttpUrl)(candidate);
        if (url)
            return url;
    }
    return undefined;
}
function entriesOf(document) {
    var _a, _b;
    var _c;
    if ((_a = document === null || document === void 0 ? void 0 : document.rss) === null || _a === void 0 ? void 0 : _a.channel) {
        const channel = Array.isArray(document.rss.channel)
            ? document.rss.channel[0]
            : document.rss.channel;
        return Array.isArray(channel === null || channel === void 0 ? void 0 : channel.item) ? channel.item : [];
    }
    if ((_b = document === null || document === void 0 ? void 0 : document.feed) === null || _b === void 0 ? void 0 : _b.entry) {
        return Array.isArray(document.feed.entry) ? document.feed.entry : [];
    }
    const rdf = (_c = document === null || document === void 0 ? void 0 : document["rdf:RDF"]) !== null && _c !== void 0 ? _c : document === null || document === void 0 ? void 0 : document.RDF;
    if (rdf === null || rdf === void 0 ? void 0 : rdf.item)
        return Array.isArray(rdf.item) ? rdf.item : [];
    return [];
}
async function readFeed(feed, limit) {
    const response = await (0, http_1.newsHttpGet)(VENDOR, feed.url, { maxBytes: RSS_MAX_BYTES });
    if (!response.ok)
        return { ok: false, error: response.error };
    if (declaresEntities(response.body)) {
        return {
            ok: false,
            error: {
                message: "The feed declares XML entities. It has not been parsed — a feed does not need them, and expanding them is a memory-exhaustion risk.",
                retryable: false,
            },
        };
    }
    let document;
    try {
        document = await (0, xml2js_1.parseStringPromise)(response.body, {
            trim: true,
            explicitArray: true,
            xmlns: false,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: {
                message: `The feed is not valid XML: ${String((error === null || error === void 0 ? void 0 : error.message) || "parse error").slice(0, 200)}`,
                retryable: false,
            },
        };
    }
    const entries = entriesOf(document);
    if (entries.length === 0) {
        return {
            ok: false,
            error: {
                message: "The URL parsed as XML but carries no RSS or Atom entries. Check that it is the feed address and not the site's home page.",
                retryable: false,
            },
        };
    }
    const items = [];
    for (const entry of entries) {
        if (items.length >= limit)
            break;
        const item = (0, normalise_1.buildItem)({
            externalId: text(entry === null || entry === void 0 ? void 0 : entry.guid) || text(entry === null || entry === void 0 ? void 0 : entry.id) || undefined,
            publishedAt: text(entry === null || entry === void 0 ? void 0 : entry.pubDate) ||
                text(entry === null || entry === void 0 ? void 0 : entry.published) ||
                text(entry === null || entry === void 0 ? void 0 : entry.updated) ||
                text(entry === null || entry === void 0 ? void 0 : entry["dc:date"]),
            headline: text(entry === null || entry === void 0 ? void 0 : entry.title),
            summary: text(entry === null || entry === void 0 ? void 0 : entry.description) ||
                text(entry === null || entry === void 0 ? void 0 : entry.summary) ||
                text(entry === null || entry === void 0 ? void 0 : entry["content:encoded"]) ||
                text(entry === null || entry === void 0 ? void 0 : entry.content),
            url: linkOf(entry),
            imageUrl: imageOf(entry),
            category: feed.category || "rss",
            relatedSymbols: undefined,
        });
        if (item)
            items.push(item);
    }
    return { ok: true, items };
}
exports.rssAdapter = {
    name: "rss",
    requiredCredentials: constants_1.NEWS_PROVIDER_CREDENTIALS.rss,
    async fetch(ctx) {
        const feeds = (0, coerce_1.readFeeds)(ctx.config);
        if (feeds.length === 0) {
            return {
                ok: false,
                error: { message: "No feed URLs are configured", retryable: false },
            };
        }
        const perFeed = Math.max(1, Math.ceil(ctx.limit / feeds.length));
        const items = [];
        const failures = [];
        for (const feed of feeds) {
            if (items.length >= ctx.limit)
                break;
            const result = await readFeed(feed, perFeed);
            if (!result.ok) {
                failures.push(`${feed.url}: ${result.error.message}`);
                continue;
            }
            items.push(...result.items);
        }
        if (items.length === 0 && failures.length > 0) {
            return {
                ok: false,
                error: {
                    message: failures.join(" | ").slice(0, 900),
                    retryable: false,
                },
            };
        }
        return { ok: true, items: items.slice(0, ctx.limit) };
    },
    async test(config) {
        const feeds = (0, coerce_1.readFeeds)(config);
        if (feeds.length === 0) {
            return {
                valid: false,
                message: "No feed URLs are configured. Add at least one http(s) RSS or Atom URL and save before testing.",
            };
        }
        const results = [];
        let working = 0;
        let sampled = 0;
        for (const feed of feeds) {
            const result = await readFeed(feed, 5);
            if (result.ok) {
                working++;
                sampled += result.items.length;
                results.push(`OK ${feed.url} (${result.items.length} entries)`);
            }
            else {
                results.push(`FAILED ${feed.url} — ${result.error.message}`);
            }
        }
        return {
            valid: working > 0,
            sampled,
            message: `${working} of ${feeds.length} feeds responded. ${results.join(" | ")}`.slice(0, 1500),
        };
    },
};
