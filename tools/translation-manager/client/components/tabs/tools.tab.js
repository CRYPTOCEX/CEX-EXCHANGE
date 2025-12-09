// Translation Tools Tab Functionality
(function() {
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    // Store directories data for filtering
    let allDirectories = [];

    function initializeToolsTab() {
        setupEventListeners();
        loadExtractionDirectories();
        setupDirectoryFilter();
    }

    function setupEventListeners() {
        // Extract Translations button (new)
        const extractTransBtn = document.querySelector('[data-tool="extract-translations"]');
        if (extractTransBtn) {
            extractTransBtn.addEventListener('click', extractTranslations);
        }

        // Extract Menu button
        const menuBtn = document.querySelector('[data-tool="extract-menu"]');
        if (menuBtn) {
            menuBtn.addEventListener('click', extractMenuTranslations);
        }

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
            if (tool && tool !== 'duplicates' && tool !== 'missing' && tool !== 'extract-menu' && tool !== 'extract-translations') {
                btn.addEventListener('click', () => runTool(tool));
            }
        });
    }

    async function extractMenuTranslations() {
        const btn = document.querySelector('[data-tool="extract-menu"]');
        const resultsContainer = document.getElementById('tool-results');
        const resultsContent = document.getElementById('tool-results-content');

        if (!resultsContainer || !resultsContent) return;

        // Show loading state
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i> Extracting Menu Translations...';

        try {
            const response = await fetch(`${API_BASE}/api/tools-v2/extract-menu`, {
                method: 'POST'
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to extract menu translations');
            }

            // Display results
            displayMenuExtractionResults(data);
            resultsContainer.classList.remove('hidden');
            UIUtils.showSuccess('Menu translations extracted successfully!');

        } catch (error) {
            console.error('Error extracting menu translations:', error);
            UIUtils.showError('Failed to extract menu translations: ' + error.message);
        } finally {
            // Restore button state
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-list mr-3"></i> Extract Menu Translations';
        }
    }

    function displayMenuExtractionResults(data) {
        const resultsContent = document.getElementById('tool-results-content');
        if (!resultsContent) return;

        const html = `
            <div class="space-y-4">
                <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div class="flex items-center mb-4">
                        <i class="fas fa-check-circle text-green-600 text-2xl mr-3"></i>
                        <h3 class="text-lg font-semibold text-green-800">
                            Menu Translations Extracted Successfully!
                        </h3>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div class="bg-white rounded-lg p-4 shadow-sm">
                            <div class="text-3xl font-bold text-green-600 mb-1">
                                ${data.stats?.keysExtracted || 0}
                            </div>
                            <div class="text-sm text-gray-600">Translation Keys Extracted</div>
                        </div>
                        <div class="bg-white rounded-lg p-4 shadow-sm">
                            <div class="text-3xl font-bold text-blue-600 mb-1">
                                ${data.stats?.filesUpdated || 0}
                            </div>
                            <div class="text-sm text-gray-600">Locale Files Updated</div>
                        </div>
                        <div class="bg-white rounded-lg p-4 shadow-sm">
                            <div class="text-3xl font-bold text-purple-600 mb-1">
                                ${data.stats?.totalAdded || 0}
                            </div>
                            <div class="text-sm text-gray-600">Total Keys Added</div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg p-4 mt-4">
                        <h4 class="font-semibold text-gray-700 mb-2">
                            <i class="fas fa-info-circle mr-2"></i>What was extracted:
                        </h4>
                        <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>Menu item titles from <code class="bg-gray-100 px-1 rounded">frontend/config/menu.ts</code></li>
                            <li>Menu item descriptions</li>
                            <li>All nested menu items</li>
                            <li>Translation keys follow format: <code class="bg-gray-100 px-1 rounded">menu.{key}.{field}</code></li>
                        </ul>
                    </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 class="font-semibold text-blue-800 mb-2">
                        <i class="fas fa-lightbulb mr-2"></i>Next Steps:
                    </h4>
                    <ol class="list-decimal list-inside text-sm text-blue-700 space-y-1">
                        <li>Review the extracted translations in the <strong>Locales</strong> tab</li>
                        <li>Use the <strong>AI Translate</strong> tab to translate menu items to other languages</li>
                        <li>Update your menu components to use <code class="bg-blue-100 px-1 rounded">useTranslations()</code></li>
                        <li>Test menu translations by switching languages</li>
                    </ol>
                </div>

                ${data.output ? `
                    <details class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <summary class="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                            <i class="fas fa-terminal mr-2"></i>View Extraction Log
                        </summary>
                        <pre class="mt-3 text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">${escapeHtml(data.output)}</pre>
                    </details>
                ` : ''}
            </div>
        `;

        resultsContent.innerHTML = html;
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

    async function loadExtractionDirectories() {
        const select = document.getElementById('extract-directory-select');
        if (!select) return;

        select.innerHTML = '<option value="">Loading directories...</option>';

        try {
            const response = await fetch(`${API_BASE}/api/tools-v2/extraction-directories`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load directories');
            }

            // Store for filtering
            allDirectories = data.directories;

            // Render directories
            renderDirectories(allDirectories);

        } catch (error) {
            console.error('Error loading extraction directories:', error);
            select.innerHTML = '<option value="">Error loading directories</option>';
        }
    }

    function renderDirectories(directories, filterText = '') {
        const select = document.getElementById('extract-directory-select');
        if (!select) return;

        select.innerHTML = '';

        const filter = filterText.toLowerCase().trim();

        // Filter directories if search text provided
        let filteredDirs = directories;
        if (filter) {
            filteredDirs = directories.filter(dir =>
                dir.fullPath.toLowerCase().includes(filter) ||
                dir.name.toLowerCase().includes(filter)
            );
        }

        if (filteredDirs.length === 0) {
            select.innerHTML = '<option value="" disabled>No matching directories</option>';
            return;
        }

        // Render options with full path display
        for (const dir of filteredDirs) {
            const option = document.createElement('option');
            option.value = dir.path;

            // Show full path with tsx count
            const tsxInfo = dir.tsxFiles > 0 ? ` (${dir.tsxFiles} tsx)` : '';
            option.textContent = `${dir.fullPath}${tsxInfo}`;

            // Add some visual styling for root directories
            if (dir.isRoot) {
                option.style.fontWeight = 'bold';
            }

            select.appendChild(option);
        }
    }

    function setupDirectoryFilter() {
        const filterInput = document.getElementById('extract-directory-filter');
        const select = document.getElementById('extract-directory-select');
        const refreshBtn = document.getElementById('refresh-directories-btn');
        const infoDiv = document.getElementById('selected-directory-info');
        const pathSpan = document.getElementById('selected-directory-path');
        const countSpan = document.getElementById('selected-directory-count');

        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                renderDirectories(allDirectories, e.target.value);
            });
        }

        if (select) {
            select.addEventListener('change', () => {
                const selectedValue = select.value;
                if (selectedValue && infoDiv && pathSpan && countSpan) {
                    const selectedDir = allDirectories.find(d => d.path === selectedValue);
                    if (selectedDir) {
                        pathSpan.textContent = selectedDir.fullPath;
                        countSpan.textContent = `(${selectedDir.tsxFiles} TSX files)`;
                        infoDiv.classList.remove('hidden');
                    }
                } else if (infoDiv) {
                    infoDiv.classList.add('hidden');
                }
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadExtractionDirectories();
                if (filterInput) filterInput.value = '';
            });
        }
    }

    async function extractTranslations() {
        const btn = document.querySelector('[data-tool="extract-translations"]');
        const resultsContainer = document.getElementById('tool-results');
        const resultsContent = document.getElementById('tool-results-content');
        const directorySelect = document.getElementById('extract-directory-select');
        const limitSelect = document.getElementById('extract-file-limit');

        if (!resultsContainer || !resultsContent) return;

        const directory = directorySelect?.value;
        const limit = limitSelect?.value;

        if (!directory) {
            UIUtils.showWarning('Please select a directory to extract translations from');
            return;
        }

        // Confirm before running (modifies files)
        if (!confirm(`This will modify TSX files in "frontend/${directory}". Make sure you have committed your changes.\n\nContinue?`)) {
            return;
        }

        // Show loading state
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i> Extracting Translations...';

        try {
            const response = await fetch(`${API_BASE}/api/tools-v2/extract-translations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ directory, limit: limit || null })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to extract translations');
            }

            // Display results
            displayExtractionResults(data);
            resultsContainer.classList.remove('hidden');
            UIUtils.showSuccess('Translation extraction completed!');

        } catch (error) {
            console.error('Error extracting translations:', error);
            UIUtils.showError('Failed to extract translations: ' + error.message);
        } finally {
            // Restore button state
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-wand-magic-sparkles mr-3"></i> Extract Translations';
        }
    }

    function displayExtractionResults(data) {
        const resultsContent = document.getElementById('tool-results-content');
        if (!resultsContent) return;

        const html = `
            <div class="space-y-4">
                <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div class="flex items-center mb-4">
                        <i class="fas fa-check-circle text-green-600 text-2xl mr-3"></i>
                        <h3 class="text-lg font-semibold text-green-800">
                            Translation Extraction Completed!
                        </h3>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div class="bg-white rounded-lg p-4 shadow-sm">
                            <div class="text-3xl font-bold text-blue-600 mb-1">
                                ${data.stats?.filesProcessed || 0}
                            </div>
                            <div class="text-sm text-gray-600">Files Processed</div>
                        </div>
                        <div class="bg-white rounded-lg p-4 shadow-sm">
                            <div class="text-3xl font-bold text-green-600 mb-1">
                                ${data.stats?.keysExtracted || 0}
                            </div>
                            <div class="text-sm text-gray-600">New Translation Keys</div>
                        </div>
                        <div class="bg-white rounded-lg p-4 shadow-sm">
                            <div class="text-3xl font-bold text-purple-600 mb-1">
                                ${data.stats?.filesModified || 0}
                            </div>
                            <div class="text-sm text-gray-600">Files Modified</div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg p-4 mt-4">
                        <h4 class="font-semibold text-gray-700 mb-2">
                            <i class="fas fa-info-circle mr-2"></i>What was done:
                        </h4>
                        <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>Scanned TSX files for hardcoded text in JSX</li>
                            <li>Converted text to <code class="bg-gray-100 px-1 rounded">t("key")</code> calls</li>
                            <li>Added <code class="bg-gray-100 px-1 rounded">useTranslations</code> import where needed</li>
                            <li>Added translation keys to all locale message files</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 class="font-semibold text-blue-800 mb-2">
                        <i class="fas fa-lightbulb mr-2"></i>Next Steps:
                    </h4>
                    <ol class="list-decimal list-inside text-sm text-blue-700 space-y-1">
                        <li>Review the modified files with <code class="bg-blue-100 px-1 rounded">git diff</code></li>
                        <li>Check the translation keys in <strong>frontend/messages/*.json</strong></li>
                        <li>Use the <strong>AI Translate</strong> tab to translate new keys</li>
                        <li>Test your application to ensure translations work correctly</li>
                    </ol>
                </div>

                ${data.output ? `
                    <details class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <summary class="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                            <i class="fas fa-terminal mr-2"></i>View Extraction Log
                        </summary>
                        <pre class="mt-3 text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto max-h-96">${escapeHtml(data.output)}</pre>
                    </details>
                ` : ''}
            </div>
        `;

        resultsContent.innerHTML = html;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Export functions to global scope
    window.toolsTab = {
        initialize: initializeToolsTab,
        extractMenuTranslations,
        extractTranslations,
        loadExtractionDirectories,
        findDuplicates,
        findMissingTranslations,
        runTool
    };

})();