"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitPhone = splitPhone;
exports.syncTransfiUser = syncTransfiUser;
exports.resolveOrCreateTransfiUser = resolveOrCreateTransfiUser;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
function normaliseDob(input) {
    const s = String(input || "").trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m)
        return `${m[3]}-${m[2]}-${m[1]}`;
    m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
    if (m)
        return s;
    m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (m)
        return `${m[1]}-${m[2]}-${m[3]}`;
    return null;
}
const DIAL_CODES = [
    "1", "7", "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49",
    "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90",
    "91", "92", "93", "94", "95", "98", "211", "212", "213", "216", "218", "220", "221", "222", "223", "224", "225", "226",
    "227", "228", "229", "230", "231", "232", "233", "234", "235", "236", "237", "238", "239", "240", "241", "242", "243",
    "244", "245", "248", "249", "250", "251", "252", "253", "254", "255", "256", "257", "258", "260", "261", "262", "263",
    "264", "265", "266", "267", "268", "269", "291", "297", "298", "299", "350", "351", "352", "353", "354", "355", "356",
    "357", "358", "359", "370", "371", "372", "373", "374", "375", "376", "377", "378", "380", "381", "382", "383", "385",
    "386", "387", "389", "420", "421", "423", "500", "501", "502", "503", "504", "505", "506", "507", "508", "509", "590",
    "591", "592", "593", "595", "597", "598", "599", "670", "672", "673", "674", "675", "676", "677", "678", "679", "680",
    "681", "682", "683", "685", "686", "687", "688", "689", "690", "691", "692", "850", "852", "853", "855", "856", "880",
    "886", "960", "961", "962", "963", "964", "965", "966", "967", "968", "970", "971", "972", "973", "974", "975", "976",
    "977", "992", "993", "994", "995", "996", "998",
].sort((a, b) => b.length - a.length);
function splitPhone(e164) {
    const s = String(e164 || "").trim();
    if (!/^\+\d{7,15}$/.test(s))
        return null;
    const digits = s.slice(1);
    for (const code of DIAL_CODES) {
        if (digits.startsWith(code) && digits.length - code.length >= 4) {
            return { phoneCode: `+${code}`, phone: digits.slice(code.length) };
        }
    }
    return null;
}
function fromProfile(profileRaw) {
    let p = profileRaw;
    if (typeof p === "string") {
        try {
            p = JSON.parse(p);
        }
        catch (_a) {
            return {};
        }
    }
    if (!p || typeof p !== "object")
        return {};
    const addr = p.address && typeof p.address === "object" ? p.address : {};
    return {
        dateOfBirth: p.dateOfBirth || p.dob || p.birthDate || undefined,
        country: p.country || addr.country || undefined,
        street: addr.street || addr.line1 || p.street || undefined,
        city: addr.city || p.city || undefined,
        state: addr.state || addr.region || p.state || undefined,
        postalCode: addr.postalCode || addr.postcode || addr.zip || p.postalCode || undefined,
    };
}
const SCREENING_POLL_MS = Number((_a = process.env.APP_TRANSFI_SCREENING_POLL_MS) !== null && _a !== void 0 ? _a : 6000);
const SCREENING_POLL_INTERVAL_MS = 1500;
const SCREENING_RETRY_SECONDS = Number((_b = process.env.APP_TRANSFI_SCREENING_RETRY_SECONDS) !== null && _b !== void 0 ? _b : 30);
async function syncTransfiUser(row) {
    var _a, _b, _c, _d;
    try {
        const res = await (0, utils_1.transfiRequest)("/v3/users/individual", {
            query: { limit: 100 },
        });
        const remote = (Array.isArray(res === null || res === void 0 ? void 0 : res.data) ? res.data : []).find((u) => u.userId === row.transfiUserId);
        if (!remote)
            return row;
        await row.update({
            status: remote.status || row.status,
            basicKycStatus: (_a = remote.basicKycStatus) !== null && _a !== void 0 ? _a : row.basicKycStatus,
            standardKycStatus: (_b = remote.standardKycStatus) !== null && _b !== void 0 ? _b : row.standardKycStatus,
            advancedKycStatus: (_c = remote.advancedKycStatus) !== null && _c !== void 0 ? _c : row.advancedKycStatus,
            failureMessage: (_d = remote.failureMessage) !== null && _d !== void 0 ? _d : row.failureMessage,
            lastSyncedAt: new Date(),
        });
        return row;
    }
    catch (error) {
        console_1.logger.warn("TRANSFI", `user sync failed for ${row.transfiUserId}: ${error === null || error === void 0 ? void 0 : error.message}`);
        return row;
    }
}
async function resolveOrCreateTransfiUser(platformUserId, details = {}) {
    var _a, _b;
    const existing = await db_1.models.transfiUser.findOne({ where: { userId: platformUserId } });
    if (existing) {
        let row = existing;
        if (!(0, utils_1.isUserUsable)(row))
            row = await syncTransfiUser(row);
        if ((0, utils_1.isUserUsable)(row))
            return { kind: "ready", transfiUserId: row.transfiUserId, row };
        if ((0, utils_1.isUserRejected)(row)) {
            return {
                kind: "rejected",
                transfiUserId: row.transfiUserId,
                status: row.status,
                message: row.failureMessage || undefined,
            };
        }
        return {
            kind: "screening",
            transfiUserId: row.transfiUserId,
            status: row.status,
            retryAfterSeconds: SCREENING_RETRY_SECONDS,
        };
    }
    const user = await db_1.models.user.findByPk(platformUserId);
    if (!user)
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    const profile = fromProfile(user.profile);
    const merged = {
        dateOfBirth: details.dateOfBirth || profile.dateOfBirth,
        country: (details.country || profile.country || "").toUpperCase() || undefined,
        street: details.street || profile.street,
        city: details.city || profile.city,
        state: details.state || profile.state,
        postalCode: details.postalCode || profile.postalCode,
    };
    const missing = [];
    if (!user.firstName)
        missing.push("firstName");
    if (!user.lastName)
        missing.push("lastName");
    if (!user.email)
        missing.push("email");
    const phone = splitPhone(user.phone || "");
    if (!phone)
        missing.push("phone");
    const dob = merged.dateOfBirth ? normaliseDob(merged.dateOfBirth) : null;
    if (!dob)
        missing.push("dateOfBirth");
    if (!merged.country)
        missing.push("country");
    if (!merged.street)
        missing.push("street");
    if (!merged.city)
        missing.push("city");
    if (!merged.state)
        missing.push("state");
    if (!merged.postalCode)
        missing.push("postalCode");
    if (missing.length)
        return { kind: "needs_details", missing };
    let created;
    try {
        created = await (0, utils_1.createIndividualUser)({
            firstName: user.firstName,
            lastName: user.lastName,
            country: merged.country,
            date: dob,
            email: user.email,
            phone: phone.phone,
            phoneCode: phone.phoneCode,
            address: {
                street: merged.street,
                city: merged.city,
                state: merged.state,
                postalCode: merged.postalCode,
            },
        });
    }
    catch (error) {
        if (error instanceof utils_1.TransfiError) {
            const ctxUserId = (_b = (_a = error === null || error === void 0 ? void 0 : error.details) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.userId;
            const embedded = ctxUserId || (error.message.match(/UX-\d+/) || [])[0] || undefined;
            if (embedded) {
                await persist(platformUserId, embedded, {
                    status: "user_rejected",
                    email: user.email || null,
                    failureMessage: `${error.code}: ${error.message}`,
                });
            }
            if (error.code === "EMAIL_VERIFICATION_FAILED" || error.code === "EMAIL_UNDER_MANUAL_REVIEW") {
                return {
                    kind: "rejected",
                    transfiUserId: embedded,
                    status: "user_rejected",
                    message: error.message,
                };
            }
            if (error.statusCode === 409) {
                const found = user.email ? await (0, utils_1.findUserByEmail)(user.email) : null;
                if (found === null || found === void 0 ? void 0 : found.userId) {
                    const row = await persist(platformUserId, found.userId, {
                        status: found.status || "unknown",
                        basicKycStatus: found.basicKycStatus || null,
                        email: user.email || null,
                    });
                    return (0, utils_1.isUserUsable)(found)
                        ? { kind: "ready", transfiUserId: found.userId, row }
                        : {
                            kind: "screening",
                            transfiUserId: found.userId,
                            status: found.status,
                            retryAfterSeconds: SCREENING_RETRY_SECONDS,
                        };
                }
            }
        }
        throw error;
    }
    if (!(created === null || created === void 0 ? void 0 : created.userId)) {
        throw (0, error_1.createError)({
            statusCode: 502,
            message: "TransFi did not return a user id for the created identity",
        });
    }
    let row = await persist(platformUserId, created.userId, {
        status: created.status || "unknown",
        basicKycStatus: created.basicKycStatus || null,
        standardKycStatus: created.standardKycStatus || null,
        advancedKycStatus: created.advancedKycStatus || null,
        email: user.email || null,
        failureMessage: created.failureMessage || null,
    });
    if ((0, utils_1.isUserUsable)(created))
        return { kind: "ready", transfiUserId: created.userId, row };
    const deadline = Date.now() + Math.max(0, SCREENING_POLL_MS);
    while (Date.now() < deadline && !(0, utils_1.isUserUsable)(row) && !(0, utils_1.isUserRejected)(row)) {
        await new Promise((r) => setTimeout(r, SCREENING_POLL_INTERVAL_MS));
        row = await syncTransfiUser(row);
    }
    if ((0, utils_1.isUserUsable)(row))
        return { kind: "ready", transfiUserId: row.transfiUserId, row };
    if ((0, utils_1.isUserRejected)(row)) {
        return {
            kind: "rejected",
            transfiUserId: row.transfiUserId,
            status: row.status,
            message: row.failureMessage || undefined,
        };
    }
    return {
        kind: "screening",
        transfiUserId: row.transfiUserId,
        status: row.status || "unknown",
        retryAfterSeconds: SCREENING_RETRY_SECONDS,
    };
}
async function persist(userId, transfiUserId, fields) {
    const [row] = await db_1.models.transfiUser.findOrCreate({
        where: { userId },
        defaults: { userId, transfiUserId, ...fields, lastSyncedAt: new Date() },
    });
    if (row.transfiUserId !== transfiUserId || fields) {
        await row.update({ transfiUserId, ...fields, lastSyncedAt: new Date() });
    }
    return row;
}
