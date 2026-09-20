"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_NAME_ATTRIBUTES = void 0;
exports.publicDisplayName = publicDisplayName;
exports.publicShortName = publicShortName;
exports.redactPublicNames = redactPublicNames;
exports.withPublicPresence = withPublicPresence;
const presence_1 = require("@b/utils/presence");
function publicDisplayName(user, fallback = "A trader") {
    var _a, _b, _c;
    const handle = String((_a = user === null || user === void 0 ? void 0 : user.username) !== null && _a !== void 0 ? _a : "").trim();
    if (handle)
        return handle;
    const first = String((_b = user === null || user === void 0 ? void 0 : user.firstName) !== null && _b !== void 0 ? _b : "").trim();
    const last = String((_c = user === null || user === void 0 ? void 0 : user.lastName) !== null && _c !== void 0 ? _c : "").trim();
    if (!first && !last)
        return fallback;
    const initial = last ? ` ${last[0].toUpperCase()}.` : "";
    return `${first}${initial}`.trim() || fallback;
}
function publicShortName(user, fallback = "this trader") {
    var _a, _b;
    const handle = String((_a = user === null || user === void 0 ? void 0 : user.username) !== null && _a !== void 0 ? _a : "").trim();
    if (handle)
        return handle;
    const first = String((_b = user === null || user === void 0 ? void 0 : user.firstName) !== null && _b !== void 0 ? _b : "").trim();
    return first || fallback;
}
function redactPublicNames(payload) {
    const seen = new WeakSet();
    const walk = (node) => {
        if (!node || typeof node !== "object")
            return;
        if (seen.has(node))
            return;
        seen.add(node);
        if (Array.isArray(node)) {
            for (const item of node)
                walk(item);
            return;
        }
        const looksLikePerson = Object.hasOwn(node, "firstName") || Object.hasOwn(node, "lastName");
        if (looksLikePerson) {
            const display = publicDisplayName(node, "");
            const short = publicShortName(node, "");
            if (Object.hasOwn(node, "name") || display)
                node.name = display || node.name;
            node.firstName = short || undefined;
            delete node.lastName;
            if (Object.hasOwn(node, "email"))
                delete node.email;
            if (Object.hasOwn(node, "lastLogin")) {
                const bucket = (0, presence_1.presenceBucket)(node.lastLogin);
                delete node.lastLogin;
                if (bucket)
                    node.presence = bucket;
            }
        }
        for (const key of Object.keys(node))
            walk(node[key]);
    };
    walk(payload);
    return payload;
}
exports.PUBLIC_NAME_ATTRIBUTES = ["username", "firstName", "lastName"];
async function withPublicPresence(payload) {
    var _a, _b;
    const seen = new WeakSet();
    const people = [];
    const collect = (node) => {
        if (!node || typeof node !== "object")
            return;
        if (seen.has(node))
            return;
        seen.add(node);
        if (Array.isArray(node)) {
            for (const item of node)
                collect(item);
            return;
        }
        if (typeof node.id === "string" && node.presence)
            people.push(node);
        for (const key of Object.keys(node))
            collect(node[key]);
    };
    collect(payload);
    if (!people.length)
        return payload;
    const beats = await (0, presence_1.getPresenceAt)(people.map((p) => p.id));
    if (!beats.size)
        return payload;
    const RANK = { stale: 1, away: 2, online: 3 };
    for (const person of people) {
        const beat = beats.get(person.id);
        if (!beat)
            continue;
        const fromBeat = (0, presence_1.presenceBucket)(beat);
        if (!fromBeat)
            continue;
        if (((_a = RANK[fromBeat]) !== null && _a !== void 0 ? _a : 0) > ((_b = RANK[person.presence]) !== null && _b !== void 0 ? _b : 0)) {
            person.presence = fromBeat;
        }
    }
    return payload;
}
