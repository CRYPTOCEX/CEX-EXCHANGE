"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomError = void 0;
exports.createError = createError;
class CustomError extends Error {
    constructor(arg1, arg2) {
        const statusCode = typeof arg1 === "object" ? arg1.statusCode : arg1;
        const message = typeof arg1 === "object" ? arg1.message : arg2;
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.CustomError = CustomError;
function createError(arg1, arg2) {
    if (typeof arg1 === "object") {
        return new CustomError(arg1);
    }
    else {
        return new CustomError(arg1, arg2);
    }
}
