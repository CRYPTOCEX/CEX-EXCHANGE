"use strict";
const fs = require('node:fs');
const path = require('node:path');
const denied = (statusCode, message) => Object.assign(new Error(message), { statusCode });
exports.openDownloadFile = async (filePath, baseDirectory = process.env.UPLOAD_DIR || './uploads/ecommerce/products') => {
    if (typeof filePath !== 'string' || !filePath || filePath.includes('\0') || path.isAbsolute(filePath)) throw denied(403, 'Access denied');
    let handle;
    try {
        const base = await fs.promises.realpath(baseDirectory);
        const candidate = path.resolve(base, filePath);
        if (!candidate.startsWith(base + path.sep)) throw denied(403, 'Access denied');
        const resolved = await fs.promises.realpath(candidate);
        if (!resolved.startsWith(base + path.sep)) throw denied(403, 'Access denied');
        handle = await fs.promises.open(resolved, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        const stats = await handle.stat();
        if (!stats.isFile()) throw denied(403, 'Access denied');
        // Check the opened descriptor too: a directory symlink could change between realpath and open.
        const openedPath = await fs.promises.realpath(`/proc/self/fd/${handle.fd}`);
        if (!openedPath.startsWith(base + path.sep)) throw denied(403, 'Access denied');
        return { handle, stats, fileName: path.basename(resolved) };
    } catch (error) {
        if (handle) await handle.close();
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throw denied(404, 'Download file not found');
        if (error.code === 'ELOOP') throw denied(403, 'Access denied');
        throw error;
    }
};
