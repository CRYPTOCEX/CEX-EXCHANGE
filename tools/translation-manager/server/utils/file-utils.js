const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

async function readJsonFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return {};
    }
}

function getTsxFiles(pattern = '**/*.{tsx,jsx}', baseDir = null) {
    const searchPath = baseDir || path.join(__dirname, '../../../../frontend');
    try {
        // Simple recursive file finding without glob dependency
        const files = [];

        // Parse pattern to determine which extensions to look for
        let extensions = ['.tsx', '.jsx']; // default
        if (pattern.includes('*.ts') && !pattern.includes('*.tsx')) {
            // Pattern specifically asks for .ts files (not .tsx)
            extensions = ['.ts'];
        } else if (pattern.includes('*.{ts,tsx}') || pattern.includes('*.{tsx,ts}')) {
            extensions = ['.ts', '.tsx'];
        }

        function findFiles(dir) {
            const items = fsSync.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fsSync.statSync(fullPath);
                if (stat.isDirectory()) {
                    // Skip common build/output directories, but be careful not to skip 'builder' which contains 'build'
                    const skipDirs = ['node_modules', 'dist', '.next'];
                    const isSkippable = skipDirs.includes(item) || item === 'build';
                    if (!isSkippable) {
                        findFiles(fullPath);
                    }
                } else {
                    // Check if file matches any of the target extensions
                    for (const ext of extensions) {
                        if (item.endsWith(ext)) {
                            files.push(fullPath);
                            break;
                        }
                    }
                }
            }
        }
        findFiles(searchPath);
        return files;
    } catch (error) {
        console.error('Error finding TSX files:', error);
        return [];
    }
}

async function saveJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    readJsonFile,
    getTsxFiles,
    saveJsonFile
};