// Translation Tools Tab Functionality
(function() {
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    function initializeToolsTab() {
        setupEventListeners();
    }

    function setupEventListeners() {
        // Find Duplicates button
        const duplicatesBtn = document.querySelector('[data-tool="duplicates"]');
        if (duplicatesBtn) {
            duplicatesBtn.addEventListener('click', findDuplicates);
        }

        // Find Missing button
        const missingBtn = document.querySelector('[data-tool="missing"]');
        if (missingBtn) {
            missingBtn.addEventListener('click', findMissingTranslations);
        }

        // Other tool buttons (if any)
        document.querySelectorAll('.tool-btn').forEach(btn => {
            if (!btn.hasAttribute('data-tool')) return;
            
            const tool = btn.getAttribute('data-tool');
            if (tool && tool !== 'duplicates' && tool !== 'missing') {
                btn.addEventListener('click', () => runTool(tool));
            }
        });
    }

    async function findDuplicates() {
        const btn = document.querySelector('[data-tool="duplicates"]');
        const resultsContainer = document.getElementById('tool-results');
        const resultsContent = document.getElementById('tool-results-content');
        
        if (!resultsContainer || !resultsContent) return;
        
        // Show loading state
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i> Finding Duplicates...';
        
        try {
            const response = await fetch(`${API_BASE}/api/tools/find-duplicates`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to find duplicates');
            }
            
            // Display results
            displayDuplicatesResults(data);
            resultsContainer.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error finding duplicates:', error);
            UIUtils.showError('Failed to find duplicates: ' + error.message);
        } finally {
            // Restore button state
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-copy mr-3"></i> Find Duplicate Values';
        }
    }

    function displayDuplicatesResults(data) {
        const resultsContent = document.getElementById('tool-results-content');
        if (!resultsContent) return;
        
        if (!data.duplicates || data.duplicates.length === 0) {
            resultsContent.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p class="text-green-800">
                        <i class="fas fa-check-circle mr-2"></i>
                        No duplicate values found across translation keys.
                    </p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="text-blue-800 font-semibold">
                        Found ${data.duplicates.length} duplicate values
                    </p>
                </div>
                
                <div class="space-y-4">
                    ${data.duplicates.map(dup => `
                        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="mb-2">
                                <span class="font-semibold text-gray-700">Value:</span>
                                <span class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">${escapeHtml(dup.value)}</span>
                            </div>
                            <div class="mb-2">
                                <span class="font-semibold text-gray-700">Found in ${dup.keys.length} keys:</span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                ${dup.keys.map(key => `
                                    <div class="bg-gray-50 p-2 rounded text-sm">
                                        <code class="text-blue-600">${key}</code>
                                    </div>
                                `).join('')}
                            </div>
                            ${dup.locales && dup.locales.length > 0 ? `
                                <div class="mt-2 text-sm text-gray-600">
                                    <span class="font-semibold">Locales:</span> ${dup.locales.join(', ')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-800 text-sm">
                        <i class="fas fa-info-circle mr-2"></i>
                        Consider consolidating these duplicate values to improve translation consistency and reduce redundancy.
                    </p>
                </div>
            </div>
        `;
        
        resultsContent.innerHTML = html;
    }

    async function findMissingTranslations() {
        const btn = document.querySelector('[data-tool="missing"]');
        const resultsContainer = document.getElementById('tool-results');
        const resultsContent = document.getElementById('tool-results-content');
        
        if (!resultsContainer || !resultsContent) return;
        
        // Show loading state
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i> Finding Missing Translations...';
        
        try {
            const response = await fetch(`${API_BASE}/api/tools-v2/find-missing-v2`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to find missing translations');
            }
            
            // Display results
            displayMissingResults(data);
            resultsContainer.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error finding missing translations:', error);
            UIUtils.showError('Failed to find missing translations: ' + error.message);
        } finally {
            // Restore button state
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search mr-3"></i> Find Missing Translations';
        }
    }

    function displayMissingResults(data) {
        const resultsContent = document.getElementById('tool-results-content');
        if (!resultsContent) return;
        
        const hasMissing = data.missing && data.missing.length > 0;
        const hasOrphaned = data.orphaned && data.orphaned.length > 0;
        
        if (!hasMissing && !hasOrphaned) {
            resultsContent.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p class="text-green-800">
                        <i class="fas fa-check-circle mr-2"></i>
                        All translation keys are in sync! No missing or orphaned keys found.
                    </p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="space-y-6">';
        
        // Statistics
        html += `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-blue-800 font-semibold mb-2">Translation Key Statistics</p>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span class="font-semibold">Used in code:</span> ${data.stats.totalUsedInCode}</div>
                    <div><span class="font-semibold">In translations:</span> ${data.stats.totalInTranslations}</div>
                    <div><span class="font-semibold">Missing:</span> <span class="text-red-600">${data.stats.totalMissing}</span></div>
                    <div><span class="font-semibold">Orphaned:</span> <span class="text-yellow-600">${data.stats.totalOrphaned}</span></div>
                </div>
                ${data.stats.filesScanned ? `
                    <div class="mt-2 text-xs text-gray-600">
                        Scanned ${data.stats.filesScanned} files in folders: ${data.stats.foldersScanned ? data.stats.foldersScanned.join(', ') : 'selected folders'}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Missing translations with select and add functionality
        if (hasMissing) {
            html += `
                <div class="space-y-4">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-red-700">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Missing Translations (${data.stats.totalMissing}${data.hasMore?.missing ? '+' : ''})
                        </h3>
                        <button id="add-selected-keys" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            <i class="fas fa-plus mr-2"></i>Add Selected Keys
                        </button>
                    </div>
                    <p class="text-sm text-gray-600">These keys are used in the code but not found in translation files. Select the ones you want to add:</p>
                    
                    <div class="flex gap-2 mb-2">
                        <button id="select-all-missing" class="text-sm text-blue-600 hover:text-blue-700">Select All</button>
                        <span class="text-gray-400">|</span>
                        <button id="deselect-all-missing" class="text-sm text-blue-600 hover:text-blue-700">Deselect All</button>
                    </div>
                    
                    <div class="space-y-3 max-h-96 overflow-y-auto">
                        ${data.missing.map((item, index) => `
                            <div class="border border-red-200 rounded-lg p-4 bg-red-50 hover:bg-red-100 transition-colors">
                                <div class="flex items-start gap-3">
                                    <input type="checkbox" 
                                           id="missing-key-${index}" 
                                           data-key="${escapeHtml(item.key)}"
                                           data-suggested-value="${escapeHtml(item.suggestedValue || item.key)}"
                                           class="missing-key-checkbox mt-1">
                                    <div class="flex-1">
                                        <div class="mb-2">
                                            <label for="missing-key-${index}" class="cursor-pointer">
                                                <span class="font-semibold text-gray-700">Key:</span>
                                                <code class="bg-white px-2 py-1 rounded font-mono text-sm text-red-600">${escapeHtml(item.key)}</code>
                                                <span class="ml-2 text-sm text-gray-500">(used ${item.count} time${item.count !== 1 ? 's' : ''})</span>
                                            </label>
                                        </div>
                                        <div class="mb-2">
                                            <span class="font-semibold text-gray-700 text-sm">Suggested value:</span>
                                            <input type="text" 
                                                   id="value-${index}"
                                                   value="${escapeHtml(item.suggestedValue || item.key)}" 
                                                   class="ml-2 px-2 py-1 border rounded text-sm w-64"
                                                   placeholder="Enter translation value">
                                        </div>
                                        ${item.examples && item.examples.length > 0 ? `
                                            <details class="text-xs text-gray-600">
                                                <summary class="cursor-pointer hover:text-gray-800">View usage examples</summary>
                                                <div class="mt-1 space-y-1">
                                                    ${item.examples.map(ex => `
                                                        <div class="bg-white p-1 rounded">
                                                            <span class="font-mono">${ex.file}:${ex.line}</span> - 
                                                            <code>${escapeHtml(ex.context)}</code>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </details>
                                        ` : ''}
                                        <div class="text-xs text-gray-600 mt-1">
                                            <span class="font-semibold">Files:</span> ${item.files.slice(0, 3).join(', ')}${item.files.length > 3 ? ` +${item.files.length - 3} more` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${data.hasMore?.missing ? `
                        <p class="text-sm text-yellow-600">
                            <i class="fas fa-info-circle mr-1"></i>
                            Showing first 100 missing keys. Total: ${data.stats.totalMissing}
                        </p>
                    ` : ''}
                </div>
            `;
        }
        
        // Orphaned keys
        if (hasOrphaned) {
            html += `
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-yellow-700">
                        <i class="fas fa-info-circle mr-2"></i>
                        Orphaned Keys (${data.orphaned.length})
                    </h3>
                    <p class="text-sm text-gray-600">These keys exist in translation files but are not used in the code:</p>
                    <div class="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            ${data.orphaned.slice(0, 50).map(key => `
                                <code class="text-sm font-mono text-yellow-700">${escapeHtml(key)}</code>
                            `).join('')}
                        </div>
                        ${data.orphaned.length > 50 ? `
                            <p class="text-sm text-yellow-600 mt-3">...and ${data.orphaned.length - 50} more</p>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        html += `
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p class="text-gray-700 text-sm">
                    <i class="fas fa-lightbulb mr-2"></i>
                    <strong>Tips:</strong> Missing keys should be added to translation files. Orphaned keys can be removed if they're truly unused.
                </p>
            </div>
        </div>`;
        
        resultsContent.innerHTML = html;
        
        // Setup event handlers for missing keys selection
        setupMissingKeysHandlers();
    }

    function setupMissingKeysHandlers() {
        const checkboxes = document.querySelectorAll('.missing-key-checkbox');
        const addButton = document.getElementById('add-selected-keys');
        const selectAllBtn = document.getElementById('select-all-missing');
        const deselectAllBtn = document.getElementById('deselect-all-missing');
        
        if (!checkboxes.length) return;
        
        // Handle checkbox changes
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
                if (addButton) {
                    addButton.disabled = !anyChecked;
                }
            });
        });
        
        // Select all
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                checkboxes.forEach(cb => cb.checked = true);
                if (addButton) addButton.disabled = false;
            });
        }
        
        // Deselect all
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                checkboxes.forEach(cb => cb.checked = false);
                if (addButton) addButton.disabled = true;
            });
        }
        
        // Add selected keys
        if (addButton) {
            addButton.addEventListener('click', async () => {
                const selectedKeys = [];
                
                checkboxes.forEach((checkbox, index) => {
                    if (checkbox.checked) {
                        const key = checkbox.dataset.key;
                        const valueInput = document.getElementById(`value-${index}`);
                        const value = valueInput ? valueInput.value : checkbox.dataset.suggestedValue;
                        
                        selectedKeys.push({ key, value });
                    }
                });
                
                if (selectedKeys.length === 0) {
                    UIUtils.showWarning('No keys selected');
                    return;
                }
                
                // Confirm action
                if (!confirm(`Add ${selectedKeys.length} translation key${selectedKeys.length > 1 ? 's' : ''} to all locale files?`)) {
                    return;
                }
                
                addButton.disabled = true;
                addButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding Keys...';
                
                try {
                    const response = await fetch(`${API_BASE}/api/tools-v2/add-missing`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ keys: selectedKeys })
                    });
                    
                    const result = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to add keys');
                    }
                    
                    UIUtils.showSuccess(result.message || `Successfully added ${selectedKeys.length} keys`);
                    
                    // Remove added keys from the list
                    checkboxes.forEach((checkbox) => {
                        if (checkbox.checked) {
                            const parent = checkbox.closest('.border');
                            if (parent) {
                                parent.style.opacity = '0.5';
                                parent.style.textDecoration = 'line-through';
                            }
                        }
                    });
                    
                } catch (error) {
                    console.error('Error adding keys:', error);
                    UIUtils.showError('Failed to add keys: ' + error.message);
                } finally {
                    addButton.innerHTML = '<i class="fas fa-plus mr-2"></i>Add Selected Keys';
                    addButton.disabled = true;
                }
            });
        }
    }

    async function runTool(toolName) {
        console.log(`Running tool: ${toolName}`);
        UIUtils.showInfo(`Tool "${toolName}" is not yet implemented`);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Export functions to global scope
    window.toolsTab = {
        initialize: initializeToolsTab,
        findDuplicates,
        findMissingTranslations,
        runTool
    };

})();