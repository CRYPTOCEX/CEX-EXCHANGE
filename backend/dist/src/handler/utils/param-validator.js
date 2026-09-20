"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParameterValue = getParameterValue;
exports.validateParameter = validateParameter;
exports.validateParameters = validateParameters;
const error_1 = require("@b/utils/error");
const validation_1 = require("@b/utils/validation");
function getParameterValue(parameter, sources) {
    switch (parameter.in) {
        case "query":
            return sources.query[parameter.name];
        case "header":
            return sources.headers[parameter.name];
        case "path":
            return sources.params[parameter.name];
        case "cookie":
            return sources.cookies[parameter.name];
        default:
            return undefined;
    }
}
function validateParameter(parameter, value) {
    if (!parameter.schema) {
        return value;
    }
    try {
        return (0, validation_1.validateSchema)(value, parameter.schema);
    }
    catch (error) {
        if (error.isValidationError) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Parameter "${parameter.name}": ${error.message}`,
            });
        }
        else {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Validation error for ${parameter.in} parameter "${parameter.name}": ${error.message}`,
            });
        }
    }
}
function validateParameters(parameters, sources) {
    const result = {
        query: { ...sources.query },
        params: { ...sources.params },
        cookies: { ...sources.cookies },
    };
    for (const parameter of parameters) {
        const value = getParameterValue(parameter, sources);
        if (value === undefined && parameter.required) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Missing required ${parameter.in} parameter: "${parameter.name}"`,
            });
        }
        if (value !== undefined) {
            const validatedValue = validateParameter(parameter, value);
            switch (parameter.in) {
                case "query":
                    result.query[parameter.name] = validatedValue;
                    break;
                case "path":
                    result.params[parameter.name] = validatedValue;
                    break;
                case "cookie":
                    result.cookies[parameter.name] = validatedValue;
                    break;
            }
        }
    }
    return result;
}
