"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPhoneNumber = isValidPhoneNumber;
exports.formatPhoneNumber = formatPhoneNumber;
exports.getCountryCode = getCountryCode;
exports.formatPhoneForDisplay = formatPhoneForDisplay;
exports.validatePhoneNumbers = validatePhoneNumbers;
exports.normalizePhoneNumber = normalizePhoneNumber;
exports.isMobilePhone = isMobilePhone;
exports.getPhoneMetadata = getPhoneMetadata;
const console_1 = require("@b/utils/console");
function isValidPhoneNumber(phone) {
    if (!phone) {
        return false;
    }
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
}
function formatPhoneNumber(phone, defaultCountryCode = "+1") {
    if (!phone) {
        return "";
    }
    let formatted = phone.replace(/[^\d+]/g, "");
    if (formatted.startsWith("+") && isValidPhoneNumber(formatted)) {
        return formatted;
    }
    formatted = formatted.replace(/^(\+|00)/, "");
    if (!formatted.startsWith(defaultCountryCode.replace("+", ""))) {
        formatted = defaultCountryCode.replace("+", "") + formatted;
    }
    if (!formatted.startsWith("+")) {
        formatted = "+" + formatted;
    }
    return formatted;
}
function getCountryCode(phone) {
    if (!isValidPhoneNumber(phone)) {
        return null;
    }
    const match = phone.match(/^\+(\d{1,3})/);
    return match ? match[1] : null;
}
function formatPhoneForDisplay(phone) {
    if (!isValidPhoneNumber(phone)) {
        return phone;
    }
    const countryCode = getCountryCode(phone);
    if (!countryCode) {
        return phone;
    }
    const number = phone.substring(countryCode.length + 1);
    if (countryCode === "1") {
        if (number.length === 10) {
            return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
        }
    }
    return `+${countryCode} ${number}`;
}
function validatePhoneNumbers(phones) {
    const valid = [];
    const invalid = [];
    for (const phone of phones) {
        if (isValidPhoneNumber(phone)) {
            valid.push(phone);
        }
        else {
            invalid.push(phone);
        }
    }
    return { valid, invalid };
}
function normalizePhoneNumber(phone, defaultCountryCode = "+1") {
    try {
        const formatted = formatPhoneNumber(phone, defaultCountryCode);
        if (isValidPhoneNumber(formatted)) {
            return formatted;
        }
        console_1.logger.warn("PhoneValidation", `Invalid phone number after formatting: original="${phone}", formatted="${formatted}"`);
        return null;
    }
    catch (error) {
        console_1.logger.error("PhoneValidation", `Phone number normalization failed for: ${phone}`, error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}
function isMobilePhone(phone) {
    if (!isValidPhoneNumber(phone)) {
        return false;
    }
    const countryCode = getCountryCode(phone);
    if (countryCode === "1") {
        const number = phone.substring(2);
        const areaCode = number.substring(0, 3);
        return /^[2-9]/.test(areaCode);
    }
    return true;
}
function getPhoneMetadata(phone) {
    const valid = isValidPhoneNumber(phone);
    return {
        valid,
        formatted: valid ? phone : null,
        countryCode: valid ? getCountryCode(phone) : null,
        displayFormat: valid ? formatPhoneForDisplay(phone) : null,
        isMobile: valid ? isMobilePhone(phone) : false,
    };
}
