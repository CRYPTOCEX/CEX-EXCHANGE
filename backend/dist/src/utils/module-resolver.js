"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const module_1 = __importDefault(require("module"));
const path_1 = __importDefault(require("path"));
const originalResolveFilename = module_1.default._resolveFilename;
module_1.default._resolveFilename = function (request, parent, isMain) {
    if (request.startsWith('@b/')) {
        const modulePath = request.replace('@b/', '');
        const possiblePaths = [
            path_1.default.join(__dirname, '..', modulePath),
            path_1.default.join(__dirname, '..', '..', 'src', modulePath),
            path_1.default.join(process.cwd(), 'backend', 'src', modulePath),
            path_1.default.join(process.cwd(), 'src', modulePath),
        ];
        for (const possiblePath of possiblePaths) {
            try {
                return originalResolveFilename.call(this, possiblePath, parent, isMain);
            }
            catch (e) {
            }
        }
    }
    if (request.startsWith('@db/')) {
        const modulePath = request.replace('@db/', '');
        const possiblePaths = [
            path_1.default.join(__dirname, '..', '..', 'models', modulePath),
            path_1.default.join(process.cwd(), 'backend', 'models', modulePath),
            path_1.default.join(process.cwd(), 'models', modulePath),
        ];
        for (const possiblePath of possiblePaths) {
            try {
                return originalResolveFilename.call(this, possiblePath, parent, isMain);
            }
            catch (e) {
            }
        }
    }
    return originalResolveFilename.call(this, request, parent, isMain);
};
exports.default = {};
