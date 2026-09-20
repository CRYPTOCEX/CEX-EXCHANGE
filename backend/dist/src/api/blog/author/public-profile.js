"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicProfile = publicProfile;
exports.withPublicProfile = withPublicProfile;
const PUBLIC_PROFILE_FIELDS = ["bio", "website", "twitter", "x", "github", "linkedin"];
const PUBLIC_SOCIAL_FIELDS = [
    "twitter",
    "x",
    "dribbble",
    "instagram",
    "github",
    "gitlab",
    "telegram",
    "linkedin",
    "website",
];
function asObject(raw) {
    if (typeof raw === "string") {
        try {
            const value = JSON.parse(raw);
            return value && typeof value === "object" ? value : {};
        }
        catch (_a) {
            return {};
        }
    }
    return raw && typeof raw === "object" ? raw : {};
}
function pickScalars(source, fields) {
    const out = {};
    for (const field of fields) {
        const value = source[field];
        if (typeof value === "string" || typeof value === "number") {
            out[field] = value;
        }
    }
    return out;
}
function publicProfile(raw) {
    const parsed = asObject(raw);
    const out = pickScalars(parsed, PUBLIC_PROFILE_FIELDS);
    const social = pickScalars(asObject(parsed.social), PUBLIC_SOCIAL_FIELDS);
    if (Object.keys(social).length > 0)
        out.social = social;
    return out;
}
function withPublicProfile(author) {
    if (!(author === null || author === void 0 ? void 0 : author.user))
        return author;
    return {
        ...author,
        user: { ...author.user, profile: publicProfile(author.user.profile) },
    };
}
