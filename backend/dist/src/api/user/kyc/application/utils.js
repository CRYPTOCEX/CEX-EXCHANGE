"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateKycField = void 0;
const validateKycField = (field, value) => {
    if (field.required &&
        (value === undefined || value === null || value === "")) {
        return `${field.label} is required`;
    }
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (field.validation) {
        if (typeof value === "string") {
            if (field.validation.minLength !== undefined &&
                value.length < field.validation.minLength) {
                return `${field.label} must be at least ${field.validation.minLength} characters`;
            }
            if (field.validation.maxLength !== undefined &&
                value.length > field.validation.maxLength) {
                return `${field.label} must be at most ${field.validation.maxLength} characters`;
            }
            if (field.validation.pattern) {
                const regex = new RegExp(field.validation.pattern);
                if (!regex.test(value)) {
                    return (field.validation.message || `${field.label} has an invalid format`);
                }
            }
        }
        if (typeof value === "number") {
            if (field.validation.min !== undefined && value < field.validation.min) {
                return `${field.label} must be at least ${field.validation.min}`;
            }
            if (field.validation.max !== undefined && value > field.validation.max) {
                return `${field.label} must be at most ${field.validation.max}`;
            }
        }
    }
    switch (field.type) {
        case "TEXT":
        case "TEXTAREA":
            if (typeof value !== "string") {
                return `${field.label} must be a string`;
            }
            break;
        case "EMAIL":
            if (typeof value !== "string" ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return `Please enter a valid email address for ${field.label}`;
            }
            break;
        case "PHONE":
            if (typeof value !== "string" || !/^\+?[0-9\s\-().]{7,}$/.test(value)) {
                return `Please enter a valid phone number for ${field.label}`;
            }
            break;
        case "NUMBER":
            const numValue = typeof value === "string" ? parseFloat(value) : value;
            if (typeof numValue !== "number" || isNaN(numValue)) {
                return `${field.label} must be a valid number`;
            }
            value = numValue;
            break;
        case "DATE":
            if (typeof value !== "string" || isNaN(Date.parse(value))) {
                return `${field.label} must be a valid date`;
            }
            break;
        case "SELECT":
        case "RADIO":
            if (typeof value !== "string") {
                return `${field.label} must be a string selection`;
            }
            if (field.options && !field.options.find((opt) => opt.value === value)) {
                return `${field.label} has an invalid selection`;
            }
            break;
        case "CHECKBOX":
            if (typeof value !== "boolean") {
                return `${field.label} must be a boolean`;
            }
            break;
        case "IMAGE":
        case "FILE":
            if (typeof value !== "string") {
                return `${field.label} must be a valid file URL`;
            }
            break;
        case "ADDRESS":
            if (typeof value !== "object" || Array.isArray(value)) {
                return `${field.label} must be an object with address details`;
            }
            break;
        case "IDENTITY":
            if (typeof value !== "object" || Array.isArray(value)) {
                return `${field.label} must be an object containing identity verification details`;
            }
            if (!value.type) {
                return `${field.label} must include a document type`;
            }
            if (field.identityTypes && Array.isArray(field.identityTypes)) {
                const identityConfig = field.identityTypes.find((it) => it.value === value.type);
                if (!identityConfig) {
                    return `${field.label} has an invalid document type "${value.type}"`;
                }
                for (const docField of identityConfig.fields) {
                    if (docField.required &&
                        (value[docField.id] === undefined ||
                            value[docField.id] === null ||
                            value[docField.id] === "")) {
                        return `${field.label}: ${docField.label} is required`;
                    }
                    if (docField.type === "FILE" &&
                        typeof value[docField.id] !== "string") {
                        return `${field.label}: ${docField.label} must be a valid file URL`;
                    }
                }
            }
            break;
        case "SECTION":
            break;
        default:
            break;
    }
    return null;
};
exports.validateKycField = validateKycField;
