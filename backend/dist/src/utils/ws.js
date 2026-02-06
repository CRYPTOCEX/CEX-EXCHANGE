"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseParams = void 0;
const parseParams = (routePath, path) => {
    const routeParts = routePath.split("/");
    const pathParts = path.split("/");
    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
        const part = routeParts[i];
        const isParam = part.startsWith(":");
        if (isParam) {
            const key = part.slice(1);
            params[key] = pathParts[i];
        }
    }
    return params;
};
exports.parseParams = parseParams;
