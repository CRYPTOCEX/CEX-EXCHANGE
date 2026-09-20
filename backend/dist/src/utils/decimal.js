"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.num = void 0;
const num = (v) => {
    const n = typeof v === "number" ? v : parseFloat(String(v !== null && v !== void 0 ? v : 0));
    return Number.isFinite(n) ? n : 0;
};
exports.num = num;
