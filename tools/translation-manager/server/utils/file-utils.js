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
        function findFiles(dir) {
            const items = fsSync.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fsSync.statSync(fullPath);
                if (stat.isDirectory()) {
                    if (!item.includes('node_modules') && !item.includes('dist') && !item.includes('build')) {
                        findFiles(fullPath);
                    }
                } else if (item.endsWith('.tsx') || item.endsWith('.jsx')) {
                    files.push(fullPath);
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