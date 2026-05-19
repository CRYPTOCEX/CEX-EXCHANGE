"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseDateTimeSchema = exports.baseObjectSchema = exports.baseIntegerSchema = exports.baseEnumSchema = exports.baseBooleanSchema = exports.baseNumberSchema = exports.baseStringSchema = void 0;
const baseStringSchema = (description, maxLength = 255, minLength = 0, nullable = false, pattern = null, expectedFormat = null) => {
    const schema = {
        type: "string",
        description,
        maxLength,
        minLength,
        nullable,
    };
    if (pattern) {
        schema.pattern = pattern;
    }
    if (expectedFormat) {
        schema["x-expectedFormat"] = expectedFormat;
    }
    return schema;
};
exports.baseStringSchema = baseStringSchema;
const baseNumberSchema = (description, nullable = false) => ({
    type: "number",
    description: description,
    nullable: nullable,
});
exports.baseNumberSchema = baseNumberSchema;
const baseBooleanSchema = (description) => ({
    type: "boolean",
    description: description,
});
exports.baseBooleanSchema = baseBooleanSchema;
const baseEnumSchema = (description, enumOptions) => ({
    type: "string",
    description: description,
    enum: enumOptions,
});
exports.baseEnumSchema = baseEnumSchema;
const baseIntegerSchema = (description, nullable = false) => ({
    type: "integer",
    description: description,
    nullable: nullable,
});
exports.baseIntegerSchema = baseIntegerSchema;
const baseObjectSchema = (description, additionalProperties = false, nullable = false) => ({
    type: "object",
    description: description,
    additionalProperties: additionalProperties,
    nullable: nullable,
});
exports.baseObjectSchema = baseObjectSchema;
const baseDateTimeSchema = (description, nullable = false) => ({
    type: "string",
    format: "date-time",
    description: description,
    nullable: nullable,
});
exports.baseDateTimeSchema = baseDateTimeSchema;
