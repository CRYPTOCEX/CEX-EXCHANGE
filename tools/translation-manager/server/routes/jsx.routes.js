const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

function createJsxRoutes(getTsxFiles) {
    // Scan for unnecessary JSX expression wrappers like {'text'}
    router.get('/scan', async (req, res) => {
        try {
            const tsxFiles = getTsxFiles(); // This already returns full paths
            console.log(`[JSX SCAN] Found ${tsxFiles.length} TSX/JSX files to scan`);
            
            const wrappedStrings = new Map(); // value -> { files: Set, count: number, examples: [] }
            let totalFiles = 0;
            let totalFound = 0;
            
            // Pattern to match {'string'} or {"string"} or {`string`}
            // Must be simple string literals, not expressions or template literals with variables
            const jsxExpressionPattern = /\{['"`]([^'"`{}]*?)['"`]\}/g;
            
            for (const filePath of tsxFiles) {
                // filePath is already a full path, no need to join
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    let match;
                    
                    while ((match = jsxExpressionPattern.exec(content)) !== null) {
                        const fullMatch = match[0]; // e.g., {'text'}
                        const value = match[1]; // e.g., text
                        
                        // Skip empty strings or strings with only whitespace
                        if (!value || !value.trim()) continue;
                        
                        // Debug: log first few findings
                        if (totalFound < 5) {
                            console.log(`[JSX SCAN] Found: ${fullMatch} in file ${filePath.split('/').pop()}`);
                        }
                        
                        if (!wrappedStrings.has(value)) {
                            wrappedStrings.set(value, {
                                files: new Set(),
                                count: 0,
                                examples: [],
                                current: fullMatch,
                                replacement: value
                            });
                        }
                        
                        const entry = wrappedStrings.get(value);
                        // Store relative path for display
                        const relativePath = filePath.replace(/\\/g, '/').split('/frontend/').pop() || filePath;
                        entry.files.add(relativePath);
                        entry.count++;
                        totalFound++;
                        
                        // Store a few examples with context
                        if (entry.examples.length < 3) {
                            const startIdx = Math.max(0, match.index - 30);
                            const endIdx = Math.min(content.length, match.index + fullMatch.length + 30);
                            const context = content.substring(startIdx, endIdx).replace(/\n/g, ' ');
                            entry.examples.push({
                                file: relativePath,
                                context,
                                index: match.index
                            });
                        }
                    }
                    
                    totalFiles++;
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                }
            }
            
            // Convert to array format for response
            const results = Array.from(wrappedStrings.entries()).map(([value, data]) => ({
                value,
                current: data.current,
                replacement: data.replacement,
                files: Array.from(data.files),
                count: data.count,
                examples: data.examples
            }));
            
            // Sort by count (most occurrences first)
            results.sort((a, b) => b.count - a.count);
            
            console.log(`[JSX SCAN] Complete: Scanned ${totalFiles} files, found ${totalFound} wrapped strings, ${results.length} unique values`);
            if (results.length > 0) {
                console.log(`[JSX SCAN] Top findings: ${results.slice(0, 3).map(r => `"${r.value}" (${r.count}x)`).join(', ')}`);
            }
            
            res.json({
                success: true,
                stats: {
                    totalFiles,
                    totalFound,
                    uniqueValues: results.length
                },
                results
            });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Clean unnecessary JSX expression wrappers
    router.post('/clean', async (req, res) => {
        try {
            const { items } = req.body;
            
            if (!items || !Array.isArray(items)) {
                return res.status(400).json({ error: 'Items array is required' });
            }
            
            const frontendPath = path.join(__dirname, '../../../../frontend');
            const results = {
                cleaned: {},
                errors: []
            };
            let totalCleaned = 0;
            
            // Group items by file for efficient processing
            const fileChanges = new Map();
            for (const item of items) {
                for (const file of item.files) {
                    if (!fileChanges.has(file)) {
                        fileChanges.set(file, []);
                    }
                    fileChanges.get(file).push(item);
                }
            }
            
            // Process each file
            for (const [file, changes] of fileChanges.entries()) {
                // Reconstruct full path from relative path
                const filePath = file.includes(':\\') || file.startsWith('/') 
                    ? file // Already a full path
                    : path.join(frontendPath, file); // Relative path, needs frontend prefix
                try {
                    let content = await fs.readFile(filePath, 'utf8');
                    let modified = false;
                    let cleanedInFile = 0;
                    
                    // Sort changes by length (longest first) to avoid partial replacements
                    changes.sort((a, b) => b.value.length - a.value.length);
                    
                    for (const change of changes) {
                        // Escape special regex characters in the value
                        const escapedValue = change.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        
                        // Create patterns for different quote styles
                        const patterns = [
                            new RegExp(`\\{'${escapedValue}'\\}`, 'g'),
                            new RegExp(`\\{"${escapedValue}"\\}`, 'g'),
                            new RegExp(`\\{\`${escapedValue}\`\\}`, 'g')
                        ];
                        
                        for (const pattern of patterns) {
                            const matches = content.match(pattern);
                            if (matches) {
                                // Replace with just the value (no quotes, no braces)
                                content = content.replace(pattern, change.replacement || change.value);
                                cleanedInFile += matches.length;
                                modified = true;
                            }
                        }
                    }
                    
                    if (modified) {
                        await fs.writeFile(filePath, content, 'utf8');
                        results.cleaned[file] = cleanedInFile;
                        totalCleaned += cleanedInFile;
                    }
                    
                } catch (error) {
                    results.errors.push({ file, error: error.message });
                }
            }
            
            res.json({
                success: true,
                message: `Cleaned ${totalCleaned} JSX expressions in ${Object.keys(results.cleaned).length} files`,
                results
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function generateKeyFromText(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '.')
        .substring(0, 50);
}

module.exports = createJsxRoutes;