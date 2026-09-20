"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPRESSION_THRESHOLD = void 0;
exports.compressData = compressData;
exports.serializeResponseData = serializeResponseData;
const zlib_1 = __importDefault(require("zlib"));
const console_1 = require("@b/utils/console");
exports.COMPRESSION_THRESHOLD = 1024;
function compressData(data, acceptEncoding) {
    if (data.length < exports.COMPRESSION_THRESHOLD) {
        return { buffer: data, encoding: "identity" };
    }
    let encoding = "identity";
    let buffer = data;
    try {
        if (acceptEncoding.includes("gzip")) {
            buffer = zlib_1.default.gzipSync(data);
            encoding = "gzip";
        }
        else if (acceptEncoding.includes("br") &&
            typeof zlib_1.default.brotliCompressSync === "function") {
            buffer = zlib_1.default.brotliCompressSync(data);
            encoding = "br";
        }
        else if (acceptEncoding.includes("deflate")) {
            buffer = zlib_1.default.deflateSync(data);
            encoding = "deflate";
        }
    }
    catch (compressionError) {
        console_1.logger.warn("RESPONSE", "Compression error", compressionError);
        return { buffer: data, encoding: "identity" };
    }
    return { buffer, encoding };
}
function serializeResponseData(responseData) {
    try {
        return Buffer.from(JSON.stringify(responseData !== null && responseData !== void 0 ? responseData : {}));
    }
    catch (_a) {
        return Buffer.from(JSON.stringify({}));
    }
}
