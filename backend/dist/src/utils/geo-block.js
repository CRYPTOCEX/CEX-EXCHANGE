"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISO3_TO_ISO2 = void 0;
exports.toIsoCode = toIsoCode;
exports.pickBlockedCountry = pickBlockedCountry;
exports.profileCountryCandidates = profileCountryCandidates;
exports.kycCountryCandidates = kycCountryCandidates;
exports.headerCountryCandidate = headerCountryCandidate;
exports.resolveCountryCandidates = resolveCountryCandidates;
exports.resolveBlockedCountry = resolveBlockedCountry;
const db_1 = require("@b/db");
const COUNTRY_KEY_RE = /country|nationality/i;
const ISO_CODE_RE = /^[A-Z]{2,3}$/;
const GEO_HEADER_SENTINELS = new Set(["XX", "T1"]);
exports.ISO3_TO_ISO2 = {
    AFG: "AF", ALA: "AX", ALB: "AL", DZA: "DZ", ASM: "AS", AND: "AD",
    AGO: "AO", AIA: "AI", ATA: "AQ", ATG: "AG", ARG: "AR", ARM: "AM",
    ABW: "AW", AUS: "AU", AUT: "AT", AZE: "AZ", BHS: "BS", BHR: "BH",
    BGD: "BD", BRB: "BB", BLR: "BY", BEL: "BE", BLZ: "BZ", BEN: "BJ",
    BMU: "BM", BTN: "BT", BOL: "BO", BES: "BQ", BIH: "BA", BWA: "BW",
    BVT: "BV", BRA: "BR", IOT: "IO", BRN: "BN", BGR: "BG", BFA: "BF",
    BDI: "BI", CPV: "CV", KHM: "KH", CMR: "CM", CAN: "CA", CYM: "KY",
    CAF: "CF", TCD: "TD", CHL: "CL", CHN: "CN", CXR: "CX", CCK: "CC",
    COL: "CO", COM: "KM", COG: "CG", COD: "CD", COK: "CK", CRI: "CR",
    CIV: "CI", HRV: "HR", CUB: "CU", CUW: "CW", CYP: "CY", CZE: "CZ",
    DNK: "DK", DJI: "DJ", DMA: "DM", DOM: "DO", ECU: "EC", EGY: "EG",
    SLV: "SV", GNQ: "GQ", ERI: "ER", EST: "EE", SWZ: "SZ", ETH: "ET",
    FLK: "FK", FRO: "FO", FJI: "FJ", FIN: "FI", FRA: "FR", GUF: "GF",
    PYF: "PF", ATF: "TF", GAB: "GA", GMB: "GM", GEO: "GE", DEU: "DE",
    GHA: "GH", GIB: "GI", GRC: "GR", GRL: "GL", GRD: "GD", GLP: "GP",
    GUM: "GU", GTM: "GT", GGY: "GG", GIN: "GN", GNB: "GW", GUY: "GY",
    HTI: "HT", HMD: "HM", VAT: "VA", HND: "HN", HKG: "HK", HUN: "HU",
    ISL: "IS", IND: "IN", IDN: "ID", IRN: "IR", IRQ: "IQ", IRL: "IE",
    IMN: "IM", ISR: "IL", ITA: "IT", JAM: "JM", JPN: "JP", JEY: "JE",
    JOR: "JO", KAZ: "KZ", KEN: "KE", KIR: "KI", PRK: "KP", KOR: "KR",
    KWT: "KW", KGZ: "KG", LAO: "LA", LVA: "LV", LBN: "LB", LSO: "LS",
    LBR: "LR", LBY: "LY", LIE: "LI", LTU: "LT", LUX: "LU", MAC: "MO",
    MDG: "MG", MWI: "MW", MYS: "MY", MDV: "MV", MLI: "ML", MLT: "MT",
    MHL: "MH", MTQ: "MQ", MRT: "MR", MUS: "MU", MYT: "YT", MEX: "MX",
    FSM: "FM", MDA: "MD", MCO: "MC", MNG: "MN", MNE: "ME", MSR: "MS",
    MAR: "MA", MOZ: "MZ", MMR: "MM", NAM: "NA", NRU: "NR", NPL: "NP",
    NLD: "NL", NCL: "NC", NZL: "NZ", NIC: "NI", NER: "NE", NGA: "NG",
    NIU: "NU", NFK: "NF", MKD: "MK", MNP: "MP", NOR: "NO", OMN: "OM",
    PAK: "PK", PLW: "PW", PSE: "PS", PAN: "PA", PNG: "PG", PRY: "PY",
    PER: "PE", PHL: "PH", PCN: "PN", POL: "PL", PRT: "PT", PRI: "PR",
    QAT: "QA", REU: "RE", ROU: "RO", RUS: "RU", RWA: "RW", BLM: "BL",
    SHN: "SH", KNA: "KN", LCA: "LC", MAF: "MF", SPM: "PM", VCT: "VC",
    WSM: "WS", SMR: "SM", STP: "ST", SAU: "SA", SEN: "SN", SRB: "RS",
    SYC: "SC", SLE: "SL", SGP: "SG", SXM: "SX", SVK: "SK", SVN: "SI",
    SLB: "SB", SOM: "SO", ZAF: "ZA", SGS: "GS", SSD: "SS", ESP: "ES",
    LKA: "LK", SDN: "SD", SUR: "SR", SJM: "SJ", SWE: "SE", CHE: "CH",
    SYR: "SY", TWN: "TW", TJK: "TJ", TZA: "TZ", THA: "TH", TLS: "TL",
    TGO: "TG", TKL: "TK", TON: "TO", TTO: "TT", TUN: "TN", TUR: "TR",
    TKM: "TM", TCA: "TC", TUV: "TV", UGA: "UG", UKR: "UA", ARE: "AE",
    GBR: "GB", USA: "US", UMI: "UM", URY: "UY", UZB: "UZ", VUT: "VU",
    VEN: "VE", VNM: "VN", VGB: "VG", VIR: "VI", WLF: "WF", ESH: "EH",
    YEM: "YE", ZMB: "ZM", ZWE: "ZW",
};
function toIsoCode(value) {
    var _a;
    if (typeof value !== "string")
        return null;
    const code = value.trim().toUpperCase();
    if (!ISO_CODE_RE.test(code))
        return null;
    return code.length === 3 ? ((_a = exports.ISO3_TO_ISO2[code]) !== null && _a !== void 0 ? _a : code) : code;
}
function pickBlockedCountry(candidates, blockList) {
    if (!blockList.length)
        return null;
    const blocked = new Set(blockList.map((c) => { var _a; return (_a = toIsoCode(c)) !== null && _a !== void 0 ? _a : String(c).trim().toUpperCase(); }));
    for (const candidate of candidates) {
        const code = toIsoCode(candidate);
        if (code && blocked.has(code))
            return code;
    }
    return null;
}
function profileCountryCandidates(profile) {
    const location = profile === null || profile === void 0 ? void 0 : profile.location;
    if (!location || typeof location !== "object")
        return [];
    return [location.countryCode, location.country].filter((v) => typeof v === "string");
}
function kycCountryCandidates(data, depth = 0) {
    if (!data || typeof data !== "object" || depth > 3)
        return [];
    const out = [];
    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === "object") {
            out.push(...kycCountryCandidates(value, depth + 1));
        }
        else if (COUNTRY_KEY_RE.test(key) && typeof value === "string") {
            out.push(value);
        }
    }
    return out;
}
function headerCountryCandidate(headers) {
    const raw = headers === null || headers === void 0 ? void 0 : headers["cf-ipcountry"];
    if (!raw)
        return null;
    const code = raw.trim().toUpperCase();
    return GEO_HEADER_SENTINELS.has(code) ? null : code;
}
async function resolveCountryCandidates(userId, headers) {
    var _a;
    const candidates = [];
    try {
        const applications = await db_1.models.kycApplication.findAll({
            where: { userId, status: "APPROVED" },
        });
        for (const app of applications) {
            let data = app.data;
            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                }
                catch (_b) {
                    data = null;
                }
            }
            candidates.push(...kycCountryCandidates(data));
        }
    }
    catch (_c) {
    }
    try {
        const user = await db_1.models.user.findByPk(userId);
        let profile = null;
        try {
            profile = (_a = user === null || user === void 0 ? void 0 : user.profile) !== null && _a !== void 0 ? _a : null;
        }
        catch (_d) {
            profile = null;
        }
        if (typeof profile === "string") {
            try {
                profile = JSON.parse(profile);
            }
            catch (_e) {
                profile = null;
            }
        }
        candidates.push(...profileCountryCandidates(profile));
    }
    catch (_f) {
    }
    candidates.push(headerCountryCandidate(headers));
    return candidates;
}
async function resolveBlockedCountry(userId, blockList, headers) {
    if (!blockList || blockList.length === 0)
        return null;
    const candidates = await resolveCountryCandidates(userId, headers);
    return pickBlockedCountry(candidates, blockList);
}
