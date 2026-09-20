"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toIso2 = toIso2;
exports.resolveResidence = resolveResidence;
exports.attestedCountries = attestedCountries;
exports.isAttestedForUser = isAttestedForUser;
exports.attestedModulesFor = attestedModulesFor;
exports.emitCountryLists = emitCountryLists;
exports.assertAttestedOnNativeApp = assertAttestedOnNativeApp;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const session_1 = require("@b/utils/session");
const console_1 = require("@b/utils/console");
const COUNTRY_KEY_RE = /country|nationality|residence/i;
const ISO_CODE_RE = /^[A-Z]{2,3}$/;
const ISO3_TO_ISO2 = {
    ARE: "AE", ARG: "AR", AUS: "AU", AUT: "AT", BEL: "BE", BGR: "BG",
    BHR: "BH", BRA: "BR", CAN: "CA", CHE: "CH", CHL: "CL", CHN: "CN",
    COL: "CO", CYP: "CY", CZE: "CZ", DEU: "DE", DNK: "DK", EGY: "EG",
    ESP: "ES", EST: "EE", FIN: "FI", FRA: "FR", GBR: "GB", GRC: "GR",
    HKG: "HK", HRV: "HR", HUN: "HU", IDN: "ID", IND: "IN", IRL: "IE",
    ISL: "IS", ISR: "IL", ITA: "IT", JPN: "JP", KEN: "KE", KOR: "KR",
    KWT: "KW", LTU: "LT", LUX: "LU", LVA: "LV", MAR: "MA", MEX: "MX",
    MLT: "MT", MYS: "MY", NGA: "NG", NLD: "NL", NOR: "NO", NZL: "NZ",
    PAK: "PK", PER: "PE", PHL: "PH", POL: "PL", PRT: "PT", QAT: "QA",
    ROU: "RO", SAU: "SA", SGP: "SG", SVK: "SK", SVN: "SI", SWE: "SE",
    THA: "TH", TUR: "TR", TWN: "TW", UKR: "UA", USA: "US", VNM: "VN",
    ZAF: "ZA",
};
const COUNTRY_NAME_TO_ISO2 = {
    "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US", USA: "US",
    "UNITED KINGDOM": "GB", "GREAT BRITAIN": "GB", ENGLAND: "GB",
    SCOTLAND: "GB", WALES: "GB", "NORTHERN IRELAND": "GB", UK: "GB",
    GERMANY: "DE", DEUTSCHLAND: "DE", FRANCE: "FR", SPAIN: "ES",
    ESPANA: "ES", ITALY: "IT", ITALIA: "IT", NETHERLANDS: "NL",
    HOLLAND: "NL", BELGIUM: "BE", AUSTRIA: "AT", SWITZERLAND: "CH",
    PORTUGAL: "PT", IRELAND: "IE", POLAND: "PL", SWEDEN: "SE",
    NORWAY: "NO", DENMARK: "DK", FINLAND: "FI", GREECE: "GR",
    "CZECH REPUBLIC": "CZ", CZECHIA: "CZ", ROMANIA: "RO", BULGARIA: "BG",
    HUNGARY: "HU", CROATIA: "HR", SLOVAKIA: "SK", SLOVENIA: "SI",
    ESTONIA: "EE", LATVIA: "LV", LITHUANIA: "LT", LUXEMBOURG: "LU",
    MALTA: "MT", CYPRUS: "CY", ICELAND: "IS",
    CANADA: "CA", MEXICO: "MX", BRAZIL: "BR", BRASIL: "BR",
    ARGENTINA: "AR", CHILE: "CL", COLOMBIA: "CO", PERU: "PE",
    AUSTRALIA: "AU", "NEW ZEALAND": "NZ", JAPAN: "JP",
    "SOUTH KOREA": "KR", "KOREA, REPUBLIC OF": "KR", CHINA: "CN",
    INDIA: "IN", INDONESIA: "ID", MALAYSIA: "MY", SINGAPORE: "SG",
    PHILIPPINES: "PH", THAILAND: "TH", VIETNAM: "VN", "VIET NAM": "VN",
    PAKISTAN: "PK", "HONG KONG": "HK", TAIWAN: "TW",
    "UNITED ARAB EMIRATES": "AE", UAE: "AE", "SAUDI ARABIA": "SA",
    QATAR: "QA", KUWAIT: "KW", BAHRAIN: "BH", ISRAEL: "IL",
    TURKEY: "TR", TURKIYE: "TR", UKRAINE: "UA", EGYPT: "EG",
    MOROCCO: "MA", NIGERIA: "NG", KENYA: "KE", "SOUTH AFRICA": "ZA",
};
const ALPHA2_ALIASES = { UK: "GB", EL: "GR" };
function toIso2(value) {
    var _a, _b;
    const raw = String(value !== null && value !== void 0 ? value : "").trim().toUpperCase().replace(/\s+/g, " ");
    if (!raw)
        return null;
    const named = COUNTRY_NAME_TO_ISO2[raw];
    if (named)
        return named;
    if (!ISO_CODE_RE.test(raw))
        return null;
    if (raw.length === 2)
        return (_a = ALPHA2_ALIASES[raw]) !== null && _a !== void 0 ? _a : raw;
    return (_b = ISO3_TO_ISO2[raw]) !== null && _b !== void 0 ? _b : null;
}
function countryFromKycData(data, depth = 0) {
    if (!data || typeof data !== "object" || depth > 8)
        return null;
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
        if (!COUNTRY_KEY_RE.test(key))
            continue;
        if (value && typeof value === "object") {
            for (const inner of Object.values(value)) {
                const code = toIso2(inner);
                if (code)
                    return code;
            }
            continue;
        }
        const code = toIso2(value);
        if (code)
            return code;
    }
    for (const [, value] of entries) {
        if (!value || typeof value !== "object")
            continue;
        const nested = countryFromKycData(value, depth + 1);
        if (nested)
            return nested;
    }
    return null;
}
async function resolveResidence(userId) {
    var _a;
    const applications = await db_1.models.kycApplication.findAll({
        where: { userId, status: "APPROVED" },
        attributes: ["data"],
        order: [["createdAt", "ASC"]],
    });
    for (const application of applications) {
        const fromKyc = countryFromKycData(application === null || application === void 0 ? void 0 : application.data);
        if (fromKyc)
            return fromKyc;
    }
    const user = await db_1.models.user.findByPk(userId, { attributes: ["profile"] });
    const profile = user === null || user === void 0 ? void 0 : user.profile;
    const location = profile === null || profile === void 0 ? void 0 : profile.location;
    return (_a = toIso2(location === null || location === void 0 ? void 0 : location.countryCode)) !== null && _a !== void 0 ? _a : toIso2(location === null || location === void 0 ? void 0 : location.country);
}
async function readAttestations(query) {
    var _a;
    var _b;
    try {
        return (await db_1.models.operatorAttestation.findAll(query));
    }
    catch (error) {
        const missing = ((_a = error === null || error === void 0 ? void 0 : error.parent) === null || _a === void 0 ? void 0 : _a.code) === "ER_NO_SUCH_TABLE" ||
            /no such table|doesn't exist/i.test(String((_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : ""));
        if (!missing)
            throw error;
        console_1.logger.warn("ATTESTATION", "operator_attestations is missing — every regulated module will be " +
            "refused to native clients until the table exists. Run a sync or " +
            "import initial.sql.");
        return [];
    }
}
async function attestedCountries(moduleId) {
    const rows = (await readAttestations({
        where: { moduleId, expiresAt: { [sequelize_1.Op.gt]: new Date() } },
        attributes: [
            "countryCode",
            "entityName",
            "regulator",
            "licenceNumber",
            "expiresAt",
        ],
        order: [["expiresAt", "DESC"]],
        raw: true,
    }));
    const out = new Map();
    for (const row of rows) {
        const code = toIso2(row.countryCode);
        if (code && !out.has(code)) {
            out.set(code, { ...row, countryCode: code });
        }
    }
    return out;
}
async function isAttestedForUser(moduleId, residence) {
    if (!residence)
        return false;
    const countries = await attestedCountries(moduleId);
    return countries.has(residence);
}
async function attestedModulesFor(residence) {
    if (!residence)
        return new Set();
    const rows = (await readAttestations({
        where: { countryCode: residence, expiresAt: { [sequelize_1.Op.gt]: new Date() } },
        attributes: ["moduleId"],
        raw: true,
    }));
    return new Set(rows.map((r) => String(r.moduleId)));
}
async function emitCountryLists(moduleIds) {
    const runtime = {};
    const union = new Set();
    for (const moduleId of moduleIds) {
        const countries = [...(await attestedCountries(moduleId)).keys()].sort();
        runtime[moduleId] = countries;
        for (const code of countries)
            union.add(code);
    }
    const all = [...union].sort();
    return { runtime, appleStorefronts: all, playTargeting: all };
}
const ATTESTED_MODULE_LABELS = {
    trade: "Spot trading",
    futures: "Futures",
    staking: "Staking",
    ico: "Token offerings",
    p2p: "P2P trading",
    ecosystem: "Ecosystem wallets",
    "copy-trading": "Copy trading",
};
async function assertAttestedOnNativeApp(req, userId, moduleId) {
    var _a;
    if (!(0, session_1.isNativeAppRequest)(req))
        return;
    const residence = await resolveResidence(userId);
    if (residence && (await isAttestedForUser(moduleId, residence)))
        return;
    const label = (_a = ATTESTED_MODULE_LABELS[moduleId]) !== null && _a !== void 0 ? _a : moduleId;
    throw (0, error_1.createError)({
        statusCode: 403,
        message: residence
            ? `${label} is not available in your country in the mobile app. This platform is not licensed to offer it where you live.`
            : `${label} needs your country of residence confirmed before it can be used in the mobile app. Complete identity verification, or add your country to your profile, and try again.`,
    });
}
