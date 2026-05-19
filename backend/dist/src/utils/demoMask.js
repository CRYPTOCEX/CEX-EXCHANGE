"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDemoMask = applyDemoMask;
exports.isDemoMode = isDemoMode;
const isDemo = process.env.NEXT_PUBLIC_DEMO_STATUS === "true";
const MASK_PATTERNS = {
    email: (value) => {
        if (!value || typeof value !== "string")
            return value;
        const [local, domain] = value.split("@");
        if (!domain)
            return "***@***.***";
        const maskedLocal = local.length > 2
            ? local[0] + "*".repeat(Math.min(local.length - 2, 5)) + local[local.length - 1]
            : "**";
        const domainParts = domain.split(".");
        const maskedDomain = domainParts.map((part, i) => i === domainParts.length - 1 ? part : "*".repeat(Math.min(part.length, 4))).join(".");
        return `${maskedLocal}@${maskedDomain}`;
    },
    phone: (value) => {
        if (!value || typeof value !== "string")
            return value;
        const digits = value.replace(/\D/g, "");
        if (digits.length < 4)
            return "***";
        return value.slice(0, 3) + "*".repeat(Math.max(value.length - 6, 3)) + value.slice(-3);
    },
    mobile: (value) => MASK_PATTERNS.phone(value),
    address: (value) => {
        if (!value || typeof value !== "string")
            return value;
        if (value.length <= 10)
            return "*".repeat(value.length);
        return value.slice(0, 6) + "*".repeat(Math.min(value.length - 10, 12)) + value.slice(-4);
    },
    txId: (value) => {
        if (!value || typeof value !== "string")
            return value;
        if (value.length <= 12)
            return "*".repeat(value.length);
        return value.slice(0, 8) + "*".repeat(Math.min(value.length - 12, 16)) + value.slice(-4);
    },
    password: (value) => {
        if (!value || typeof value !== "string")
            return value;
        return "*".repeat(Math.min(value.length, 12));
    },
    accountId: (value) => {
        if (!value || typeof value !== "string")
            return value;
        if (value.length <= 4)
            return "*".repeat(value.length);
        return "*".repeat(value.length - 4) + value.slice(-4);
    },
    script: (value) => {
        if (!value || typeof value !== "string")
            return value;
        if (value.length <= 10)
            return "*".repeat(value.length);
        return value.slice(0, 10) + "..." + "*".repeat(8);
    },
    default: (value) => {
        if (!value || typeof value !== "string")
            return value;
        if (value.length <= 4)
            return "*".repeat(value.length);
        return value[0] + "*".repeat(Math.min(value.length - 2, 8)) + value[value.length - 1];
    },
};
function getMaskFunction(fieldName) {
    const lowerField = fieldName.toLowerCase();
    if (lowerField.includes("email"))
        return MASK_PATTERNS.email;
    if (lowerField.includes("phone") || lowerField.includes("mobile"))
        return MASK_PATTERNS.phone;
    if (lowerField.includes("address") || lowerField.includes("walletaddress"))
        return MASK_PATTERNS.address;
    if (lowerField.includes("txid") || lowerField.includes("transactionid") || lowerField.includes("txhash"))
        return MASK_PATTERNS.txId;
    if (lowerField.includes("password") || lowerField.includes("secret") || lowerField.includes("key"))
        return MASK_PATTERNS.password;
    if (lowerField.includes("accountid") || lowerField.includes("account_id"))
        return MASK_PATTERNS.accountId;
    if (lowerField.includes("script"))
        return MASK_PATTERNS.script;
    if (lowerField.includes("broker"))
        return MASK_PATTERNS.default;
    return MASK_PATTERNS.default;
}
function maskAtPath(obj, pathParts, fieldName) {
    if (!obj || typeof obj !== "object" || pathParts.length === 0)
        return;
    const [current, ...rest] = pathParts;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            maskAtPath(item, pathParts, fieldName);
        }
        return;
    }
    if (!(current in obj))
        return;
    if (rest.length === 0) {
        const value = obj[current];
        if (typeof value === "string") {
            const maskFn = getMaskFunction(fieldName);
            obj[current] = maskFn(value);
        }
    }
    else {
        const next = obj[current];
        if (Array.isArray(next)) {
            for (const item of next) {
                maskAtPath(item, rest, fieldName);
            }
        }
        else if (next && typeof next === "object") {
            maskAtPath(next, rest, fieldName);
        }
    }
}
function applyDemoMask(data, maskPaths) {
    if (!isDemo || !data || !maskPaths || maskPaths.length === 0) {
        return data;
    }
    for (const path of maskPaths) {
        const parts = path.split(".");
        const fieldName = parts[parts.length - 1];
        if (Array.isArray(data)) {
            for (const item of data) {
                maskAtPath(item, parts, fieldName);
            }
        }
        else {
            maskAtPath(data, parts, fieldName);
        }
    }
    return data;
}
function isDemoMode() {
    return isDemo;
}
