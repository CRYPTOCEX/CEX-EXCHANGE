const fsSync = require('fs');
const path = require('path');

function loadUntranslatableConfig() {
    let untranslatableConfig = {};
    try {
        untranslatableConfig = JSON.parse(
            fsSync.readFileSync(
                path.join(__dirname, '../../untranslatable-config.json'), 
                'utf8'
            )
        );
    } catch (error) {
        console.error('Warning: Could not load untranslatable-config.json, using defaults');
        untranslatableConfig = { patterns: [], customPatterns: [] };
    }
    return untranslatableConfig;
}

module.exports = {
    loadUntranslatableConfig
};