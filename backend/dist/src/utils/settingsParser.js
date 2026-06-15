"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBooleanSetting = exports.getNumericSetting = exports.parseNumeric = void 0;
const parseNumeric = (value, defaultValue = 0) => {
    if (value === null ||
        value === undefined ||
        value === "" ||
        value === "false" ||
        value === "true" ||
        value === "null") {
        return defaultValue;
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed) || !isFinite(parsed)) {
        return defaultValue;
    }
    return parsed;
};
exports.parseNumeric = parseNumeric;
const getNumericSetting = (settings, key, defaultValue = 0) => {
    let raw;
    if (settings && typeof settings.get === "function") {
        raw = settings.get(key);
    }
    else if (settings && typeof settings === "object") {
        raw = settings[key];
    }
    return (0, exports.parseNumeric)(raw, defaultValue);
};
exports.getNumericSetting = getNumericSetting;
const getBooleanSetting = (settings, key, defaultValue = false) => {
    let raw;
    if (settings && typeof settings.get === "function") {
        raw = settings.get(key);
    }
    else if (settings && typeof settings === "object") {
        raw = settings[key];
    }
    if (raw === "true" || raw === true || raw === "1") {
        return true;
    }
    if (raw === "false" ||
        raw === false ||
        raw === "0" ||
        raw == null ||
        raw === "") {
        return false;
    }
    return defaultValue;
};
exports.getBooleanSetting = getBooleanSetting;
