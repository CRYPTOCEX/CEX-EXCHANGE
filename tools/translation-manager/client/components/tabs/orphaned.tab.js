// Orphaned Translations Tab Functionality
(function() {
    let orphanedData = [];
    let filteredData = [];
    let selectedKeys = new Set();

    // Unused keys data (reverse orphan scan)
    let unusedData = [];
    let unusedFilteredData = [];
    let selectedUnusedKeys = new Set();

    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:5000`
        : '';

    // Initialize when DOM is ready (setup event listeners only)
    document.addEventListener('DOMContentLoaded', function() {
        // Don't auto-initialize, wait for router to call it
        // initializeOrphanedTab();
    });

    function initializeOrphanedTab() {
        // Scan button
        const scanBtn = document.getElementById('scan-orphaned');
        if (scanBtn) {
            scanBtn.addEventListener('click', scanOrphaned);
        }

        // Restore button
        const restoreBtn = document.getElementById('restore-orphaned');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', restoreSelected);
        }

        // Clean button
        const cleanBtn = document.getElementById('clean-orphaned');
        if (cleanBtn) {
            cleanBtn.addEventListener('click', cleanSelected);
        }

        // Clear button
        const clearBtn = document.getElementById('clear-orphaned');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearResults);
        }

        // AI Suggest button
        const aiSuggestBtn = document.getElementById('ai-suggest-orphaned');
        if (aiSuggestBtn) {
            aiSuggestBtn.addEventListener('click', aiSuggestValues);
        }

        // Select all checkbox
        const selectAll = document.getElementById('select-all-orphaned');
        if (selectAll) {
            selectAll.addEventListener('change', toggleSelectAll);
        }

        // Table select all
        const tableSelectAll = document.getElementById('orphaned-table-select-all');
        if (tableSelectAll) {
            tableSelectAll.addEventListener('change', toggleSelectAll);
        }

        // Filter input
        const filterInput = document.getElementById('orphaned-filter');
        if (filterInput) {
            filterInput.addEventListener('keyup', filterResults);
        }

        // Namespace filter
        const namespaceFilter = document.getElementById('orphaned-namespace');
        if (namespaceFilter) {
            namespaceFilter.addEventListener('change', filterResults);
        }

        // ========== UNUSED KEYS (Reverse Orphan Scan) ==========

        // Scan unused button
        const scanUnusedBtn = document.getElementById('scan-unused');
        if (scanUnusedBtn) {
            scanUnusedBtn.addEventListener('click', scanUnused);
        }

        // Remove unused button
        const removeUnusedBtn = document.getElementById('remove-unused');
        if (removeUnusedBtn) {
            removeUnusedBtn.addEventListener('click', removeSelectedUnused);
        }

        // Clear unused button
        const clearUnusedBtn = document.getElementById('clear-unused');
        if (clearUnusedBtn) {
            clearUnusedBtn.addEventListener('click', clearUnusedResults);
        }

        // Select all unused checkbox
        const selectAllUnused = document.getElementById('select-all-unused');
        if (selectAllUnused) {
            selectAllUnused.addEventListener('change', toggleSelectAllUnused);
        }

        // Table select all unused
        const tableSelectAllUnused = document.getElementById('unused-table-select-all');
        if (tableSelectAllUnused) {
            tableSelectAllUnused.addEventListener('change', toggleSelectAllUnused);
        }

        // Unused filter input
        const unusedFilterInput = document.getElementById('unused-filter');
        if (unusedFilterInput) {
            unusedFilterInput.addEventListener('keyup', filterUnusedResults);
        }

        // Unused namespace filter
        const unusedNamespaceFilter = document.getElementById('unused-namespace');
        if (unusedNamespaceFilter) {
            unusedNamespaceFilter.addEventListener('change', filterUnusedResults);
        }
    }

    async function scanOrphaned() {
        const loading = document.getElementById('orphaned-loading');
        const empty = document.getElementById('orphaned-empty');
        const results = document.getElementById('orphaned-results');
        const statsElement = document.getElementById('orphaned-stats');
        
        if (loading) loading.style.display = 'block';
        if (empty) empty.style.display = 'none';
        if (results) results.style.display = 'none';
        
        try {
            const response = await fetch(`${API_BASE}/api/orphaned/scan`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to scan');
            }
            
            // Handle the correct response format from the API
            orphanedData = data.orphaned || data.items || [];
            
            // Ensure orphanedData is an array
            if (!Array.isArray(orphanedData)) {
                orphanedData = [];
            }
            
            // The data already has the correct format from the server:
            // { namespace, key, fullKey, files, suggestedValue, fileCount }
            
            filteredData = [...orphanedData];
            
            // Update stats
            const stats = data.stats || {};
            const filesElement = document.getElementById('orphaned-files');
            const totalKeysElement = document.getElementById('orphaned-total-keys');
            const countElement = document.getElementById('orphaned-count');
            const selectedElement = document.getElementById('orphaned-selected');
            
            if (filesElement) filesElement.textContent = stats.totalFiles || 'N/A';
            if (totalKeysElement) totalKeysElement.textContent = stats.totalMessageKeys || 'N/A';
            if (countElement) countElement.textContent = stats.totalOrphaned || data.total || orphanedData.length;
            if (selectedElement) selectedElement.textContent = '0';
            
            // Populate namespace filter - only if we have namespaces
            const namespaceFilter = document.getElementById('orphaned-namespace');
            if (namespaceFilter && orphanedData.length > 0) {
                const namespaces = [...new Set(orphanedData.map(item => item.namespace || 'global'))];
                namespaceFilter.innerHTML = '<option value="">All Namespaces</option>';
                namespaces.forEach(ns => {
                    const option = document.createElement('option');
                    option.value = ns;
                    option.textContent = ns;
                    namespaceFilter.appendChild(option);
                });
            }
            
            if (loading) loading.style.display = 'none';
            if (statsElement) statsElement.style.display = 'grid';
            
            if (orphanedData.length > 0) {
                renderResults();
                if (results) results.style.display = 'block';

                const restoreBtn = document.getElementById('restore-orphaned');
                const cleanBtn = document.getElementById('clean-orphaned');
                const clearBtn = document.getElementById('clear-orphaned');
                const selectAllBtn = document.getElementById('select-all-orphaned');
                const aiSuggestBtn = document.getElementById('ai-suggest-orphaned');

                if (restoreBtn) restoreBtn.disabled = false;
                if (cleanBtn) cleanBtn.disabled = false;
                if (clearBtn) clearBtn.disabled = false;
                if (selectAllBtn) selectAllBtn.disabled = false;
                if (aiSuggestBtn) aiSuggestBtn.disabled = false;
            } else {
                if (empty) {
                    empty.style.display = 'block';
                    empty.innerHTML = `
                        <i class="fas fa-check-circle text-4xl mb-4 text-green-500"></i>
                        <h3 class="text-lg font-semibold mb-2">No Orphaned Keys Found!</h3>
                        <p>All translation keys in TSX files exist in message files.</p>
                    `;
                }
            }
        } catch (error) {
            if (loading) loading.style.display = 'none';
            showError('Failed to scan: ' + error.message);
        }
    }

    function renderResults() {
        const tbody = document.getElementById('orphaned-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        filteredData.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            const keyIdentifier = item.fullKey || `${item.namespace}.${item.key}`;
            const displayNamespace = item.namespace || 'global';
            const displayKey = item.fullKey || item.key;
            const filesHtml = item.files && item.files.length > 0
                ? item.files.map(f => `<div>${f.replace(/^.*[\\/]/, '')}</div>`).join('')
                : '<div>-</div>';

            // Escape HTML for input value
            const escapedValue = (item.customValue || item.suggestedValue || item.value || '')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            tr.innerHTML = `
                <td class="border p-2">
                    <input type="checkbox" class="orphaned-checkbox" data-key="${keyIdentifier}"
                           ${selectedKeys.has(keyIdentifier) ? 'checked' : ''}>
                </td>
                <td class="border p-2">${displayNamespace}</td>
                <td class="border p-2 font-mono text-sm">${displayKey}</td>
                <td class="border p-2">
                    <input type="text"
                           class="orphaned-value-input w-full px-2 py-1 border rounded focus:border-blue-500 focus:outline-none"
                           data-key="${keyIdentifier}"
                           value="${escapedValue}"
                           placeholder="Enter translation value...">
                </td>
                <td class="border p-2 text-xs">
                    ${filesHtml}
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add change listeners to checkboxes
        document.querySelectorAll('.orphaned-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelection);
        });

        // Add input listeners to value inputs
        document.querySelectorAll('.orphaned-value-input').forEach(input => {
            input.addEventListener('change', function() {
                const keyId = this.dataset.key;
                const newValue = this.value.trim();

                // Find the item in orphanedData and update its customValue
                const item = orphanedData.find(i => {
                    const itemKey = i.fullKey || `${i.namespace}.${i.key}`;
                    return itemKey === keyId;
                });

                if (item) {
                    item.customValue = newValue;
                }
            });
        });
    }

    function updateSelection() {
        selectedKeys.clear();
        document.querySelectorAll('.orphaned-checkbox:checked').forEach(cb => {
            selectedKeys.add(cb.dataset.key);
        });
        const selectedElement = document.getElementById('orphaned-selected');
        if (selectedElement) {
            selectedElement.textContent = selectedKeys.size;
        }
    }

    async function aiSuggestValues() {
        // Get items to suggest - either selected or all if none selected
        let itemsToSuggest = [];

        if (selectedKeys.size > 0) {
            itemsToSuggest = orphanedData.filter(item => {
                const keyId = item.fullKey || `${item.namespace}.${item.key}`;
                return selectedKeys.has(keyId);
            });
        } else {
            // If nothing selected, suggest for all visible items
            itemsToSuggest = [...filteredData];
        }

        if (itemsToSuggest.length === 0) {
            showError('No keys to suggest values for. Run scan first.');
            return;
        }

        // Get agent settings from UI
        const batchSize = parseInt(document.getElementById('orphaned-batch-size')?.value || '10');
        const maxAgents = parseInt(document.getElementById('orphaned-max-agents')?.value || '5');
        const totalBatches = Math.ceil(itemsToSuggest.length / batchSize);
        const totalWaves = Math.ceil(totalBatches / maxAgents);

        const aiBtn = document.getElementById('ai-suggest-orphaned');
        const originalBtnText = aiBtn ? aiBtn.innerHTML : '';

        if (aiBtn) {
            aiBtn.disabled = true;
            aiBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>AI Processing...';
        }

        // Show enhanced loading state
        showAILoadingState(itemsToSuggest.length, totalBatches, batchSize, maxAgents, totalWaves);

        try {
            // Prepare all keys for the server (server handles batching now)
            const keysForAI = itemsToSuggest.map(item => ({
                namespace: item.namespace,
                key: item.key,
                context: item.context || '',
                files: item.files || []
            }));

            // Single request - server handles parallel processing
            const response = await fetch(`${API_BASE}/api/orphaned/ai-suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keys: keysForAI,
                    batchSize,
                    maxAgents
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'AI suggestion failed');
            }

            if (result.success && result.suggestions) {
                // Update orphanedData with AI suggestions
                for (const suggestion of result.suggestions) {
                    const item = orphanedData.find(i => {
                        const itemKey = i.fullKey || `${i.namespace}.${i.key}`;
                        return itemKey === suggestion.fullKey;
                    });

                    if (item && suggestion.suggestedValue) {
                        item.suggestedValue = suggestion.suggestedValue;
                        item.customValue = suggestion.suggestedValue;
                    }
                }

                // Re-render to show new suggestions
                renderResults();

                const stats = result.stats || {};
                const errorMsg = stats.errors > 0 ? ` (${stats.errors} errors)` : '';
                showSuccess(`AI generated ${result.suggestions.length} suggestions using ${stats.batches || totalBatches} parallel agents!${errorMsg} Review and edit values, then click "Add to Locales".`);
            }

        } catch (error) {
            console.error('AI suggest error:', error);
            showError('AI suggestion failed: ' + error.message);
        } finally {
            if (aiBtn) {
                aiBtn.disabled = false;
                aiBtn.innerHTML = originalBtnText;
            }
        }
    }

    function toggleSelectAll(e) {
        const checked = e.target.checked;
        document.querySelectorAll('.orphaned-checkbox').forEach(cb => {
            cb.checked = checked;
        });
        
        // Sync both checkboxes
        document.getElementById('select-all-orphaned').checked = checked;
        const tableSelectAll = document.getElementById('orphaned-table-select-all');
        if (tableSelectAll) tableSelectAll.checked = checked;
        
        updateSelection();
    }

    function filterResults() {
        const filterInput = document.getElementById('orphaned-filter');
        const namespaceSelect = document.getElementById('orphaned-namespace');
        
        const filterText = filterInput ? filterInput.value.toLowerCase() : '';
        const namespace = namespaceSelect ? namespaceSelect.value : '';
        
        filteredData = orphanedData.filter(item => {
            const keyToSearch = item.fullKey || item.key || '';
            const valueToSearch = item.suggestedValue || item.value || '';
            
            const matchesFilter = !filterText || 
                keyToSearch.toLowerCase().includes(filterText) ||
                valueToSearch.toLowerCase().includes(filterText);
            const matchesNamespace = !namespace || item.namespace === namespace;
            return matchesFilter && matchesNamespace;
        });
        
        renderResults();
    }

    async function restoreSelected() {
        if (selectedKeys.size === 0) {
            showError('Please select keys to restore');
            return;
        }

        const selectedItems = orphanedData.filter(item => {
            const keyId = item.fullKey || `${item.namespace}.${item.key}`;
            return selectedKeys.has(keyId);
        });

        // Show locale selection modal (simplified for tab version)
        const locales = await getAvailableLocales();
        const selectedLocales = prompt(
            `Select locales to add keys to (comma-separated):\nAvailable: ${locales.join(', ')}`,
            locales.join(', ')
        );

        if (!selectedLocales) return;

        const localeList = selectedLocales.split(',').map(l => l.trim());

        try {
            // Send full item objects with customValue
            const keysToRestore = selectedItems.map(item => ({
                fullKey: item.fullKey || item.key,
                namespace: item.namespace,
                key: item.key,
                suggestedValue: item.suggestedValue || item.value,
                customValue: item.customValue // Include the edited value
            }));

            const response = await fetch(`${API_BASE}/api/orphaned/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keys: keysToRestore,
                    locales: localeList
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to restore');
            }

            // Show warnings if any
            if (result.results && result.results.warnings && result.results.warnings.length > 0) {
                console.warn('Warnings during restore:', result.results.warnings);
            }

            showSuccess(`Successfully added ${selectedKeys.size} keys to ${localeList.length} locales`);

            // Re-scan to update the list
            setTimeout(() => scanOrphaned(), 2000);
        } catch (error) {
            showError('Failed to restore: ' + error.message);
        }
    }

    async function cleanSelected() {
        if (selectedKeys.size === 0) {
            showError('Please select keys to clean');
            return;
        }
        
        const selectedItems = orphanedData.filter(item => {
            const keyId = item.fullKey || `${item.namespace}.${item.key}`;
            return selectedKeys.has(keyId);
        });
        
        const confirmClean = confirm(
            `Are you sure you want to remove ${selectedKeys.size} orphaned translation calls from TSX files?\n\n` +
            `This will replace t('key') calls with the key as a plain string.\n\n` +
            `This action cannot be undone!`
        );
        
        if (!confirmClean) return;
        
        showInfo('Cleaning orphaned translations from TSX files...');
        
        try {
            // Extract just the keys from selected items
            const keysToClean = selectedItems.map(item => item.fullKey || item.key);
            
            const response = await fetch(`${API_BASE}/api/orphaned/clean`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keys: keysToClean
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to clean');
            }
            
            showSuccess(result.message || `Successfully cleaned ${selectedKeys.size} orphaned keys from TSX files`);
            
            // Re-scan to update the list
            setTimeout(() => scanOrphaned(), 2000);
        } catch (error) {
            showError('Failed to clean: ' + error.message);
        }
    }

    async function getAvailableLocales() {
        try {
            // Use shared locale data if available
            if (window.sharedLocalesData) {
                return Object.keys(window.sharedLocalesData);
            }
            
            // Fallback - load if not available
            const response = await fetch(`${API_BASE}/api/locales`);
            const data = await response.json();
            // The API returns an object with locale codes as keys
            // Extract the locale codes into an array
            if (data.locales && typeof data.locales === 'object') {
                return Object.keys(data.locales);
            } else if (typeof data === 'object') {
                // If data itself is the locales object
                return Object.keys(data);
            }
            return [];
        } catch (error) {
            console.error('Failed to fetch locales:', error);
            return ['en', 'es', 'fr', 'de'];
        }
    }

    function clearResults() {
        const empty = document.getElementById('orphaned-empty');
        const results = document.getElementById('orphaned-results');
        const stats = document.getElementById('orphaned-stats');
        const restoreBtn = document.getElementById('restore-orphaned');
        const cleanBtn = document.getElementById('clean-orphaned');
        const clearBtn = document.getElementById('clear-orphaned');
        const selectAllBtn = document.getElementById('select-all-orphaned');
        const aiSuggestBtn = document.getElementById('ai-suggest-orphaned');

        if (empty) empty.style.display = 'block';
        if (results) results.style.display = 'none';
        if (stats) stats.style.display = 'none';
        if (restoreBtn) restoreBtn.disabled = true;
        if (cleanBtn) cleanBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
        if (selectAllBtn) selectAllBtn.disabled = true;
        if (aiSuggestBtn) aiSuggestBtn.disabled = true;

        orphanedData = [];
        filteredData = [];
        selectedKeys.clear();
    }

    function showSuccess(message) {
        const successDiv = document.getElementById('orphaned-success');
        if (successDiv) {
            // Reset to success styling (in case it was showing AI loading state)
            successDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4';
            successDiv.innerHTML = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        }
    }

    function showError(message) {
        const errorDiv = document.getElementById('orphaned-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    function showInfo(message, isHtml = false) {
        // Use success div with different styling for info messages
        const successDiv = document.getElementById('orphaned-success');
        if (successDiv) {
            if (isHtml) {
                successDiv.innerHTML = message;
            } else {
                successDiv.textContent = message;
            }
            successDiv.style.display = 'block';
            // Don't auto-hide info messages during operations
        }
    }

    function showAILoadingState(totalKeys, totalBatches, batchSize, maxAgents, totalWaves) {
        const successDiv = document.getElementById('orphaned-success');
        if (successDiv) {
            successDiv.className = 'bg-purple-100 border border-purple-400 text-purple-800 px-4 py-4 rounded mb-4';
            successDiv.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="flex-shrink-0">
                        <div class="relative">
                            <i class="fas fa-robot text-4xl text-purple-600 animate-pulse"></i>
                            <i class="fas fa-spinner fa-spin text-xl text-purple-500 absolute -bottom-1 -right-1"></i>
                        </div>
                    </div>
                    <div class="flex-grow">
                        <div class="font-semibold text-lg mb-1">
                            <i class="fas fa-brain mr-2"></i>AI Processing ${totalKeys} Keys...
                        </div>
                        <div class="text-sm text-purple-700 mb-2">
                            Generating English translation values using Claude AI
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div class="bg-purple-200 rounded px-2 py-1">
                                <i class="fas fa-layer-group mr-1"></i>${totalBatches} batches
                            </div>
                            <div class="bg-purple-200 rounded px-2 py-1">
                                <i class="fas fa-cubes mr-1"></i>${batchSize} keys/batch
                            </div>
                            <div class="bg-purple-200 rounded px-2 py-1">
                                <i class="fas fa-microchip mr-1"></i>${maxAgents} agents
                            </div>
                            <div class="bg-purple-200 rounded px-2 py-1">
                                <i class="fas fa-wave-square mr-1"></i>${totalWaves} wave(s)
                            </div>
                        </div>
                    </div>
                </div>
            `;
            successDiv.style.display = 'block';
        }
    }

    function hideAILoadingState() {
        const successDiv = document.getElementById('orphaned-success');
        if (successDiv) {
            // Reset to original styling
            successDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4';
        }
    }

    // ========== UNUSED KEYS FUNCTIONS (Reverse Orphan Scan) ==========

    async function scanUnused() {
        const loading = document.getElementById('unused-loading');
        const empty = document.getElementById('unused-empty');
        const results = document.getElementById('unused-results');
        const statsElement = document.getElementById('unused-stats');

        if (loading) loading.style.display = 'block';
        if (empty) empty.style.display = 'none';
        if (results) results.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE}/api/orphaned/scan-unused`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to scan');
            }

            unusedData = data.unused || [];
            unusedFilteredData = [...unusedData];

            // Update stats
            const stats = data.stats || {};
            const totalKeysEl = document.getElementById('unused-total-keys');
            const usedKeysEl = document.getElementById('unused-used-keys');
            const countEl = document.getElementById('unused-count');
            const selectedEl = document.getElementById('unused-selected');

            if (totalKeysEl) totalKeysEl.textContent = stats.totalMessageKeys || 0;
            if (usedKeysEl) usedKeysEl.textContent = stats.totalUsedKeys || 0;
            if (countEl) countEl.textContent = stats.totalUnusedKeys || data.total || unusedData.length;
            if (selectedEl) selectedEl.textContent = '0';

            // Populate namespace filter
            const namespaceFilter = document.getElementById('unused-namespace');
            if (namespaceFilter && unusedData.length > 0) {
                const namespaces = [...new Set(unusedData.map(item => item.namespace || 'global'))];
                namespaceFilter.innerHTML = '<option value="">All Namespaces</option>';
                namespaces.forEach(ns => {
                    const option = document.createElement('option');
                    option.value = ns;
                    option.textContent = ns;
                    namespaceFilter.appendChild(option);
                });
            }

            if (loading) loading.style.display = 'none';
            if (statsElement) statsElement.style.display = 'grid';

            if (unusedData.length > 0) {
                renderUnusedResults();
                if (results) results.style.display = 'block';

                // Enable buttons
                const removeBtn = document.getElementById('remove-unused');
                const clearBtn = document.getElementById('clear-unused');
                const selectAllBtn = document.getElementById('select-all-unused');

                if (removeBtn) removeBtn.disabled = false;
                if (clearBtn) clearBtn.disabled = false;
                if (selectAllBtn) selectAllBtn.disabled = false;
            } else {
                if (empty) {
                    empty.style.display = 'block';
                    empty.innerHTML = `
                        <i class="fas fa-check-circle text-4xl mb-4 text-green-500"></i>
                        <h3 class="text-lg font-semibold mb-2">No Unused Keys Found!</h3>
                        <p>All translation keys in message files are being used in the codebase.</p>
                    `;
                }
            }
        } catch (error) {
            if (loading) loading.style.display = 'none';
            showUnusedError('Failed to scan: ' + error.message);
        }
    }

    function renderUnusedResults() {
        const tbody = document.getElementById('unused-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        unusedFilteredData.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            const displayNamespace = item.namespace || 'global';
            const displayKey = item.key || '';
            const keyIdentifier = item.fullKey || `${displayNamespace}.${displayKey}`;

            // Escape HTML for value display
            const escapedValue = (item.value || '')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            // Truncate value for display
            const truncatedValue = escapedValue.length > 100
                ? escapedValue.substring(0, 100) + '...'
                : escapedValue;

            tr.innerHTML = `
                <td class="border p-2">
                    <input type="checkbox" class="unused-checkbox" data-key="${keyIdentifier}"
                           ${selectedUnusedKeys.has(keyIdentifier) ? 'checked' : ''}>
                </td>
                <td class="border p-2 text-sm">${displayNamespace}</td>
                <td class="border p-2 font-mono text-sm">${displayKey}</td>
                <td class="border p-2 text-sm text-gray-600" title="${escapedValue}">${truncatedValue}</td>
            `;
            tbody.appendChild(tr);
        });

        // Add change listeners to checkboxes
        document.querySelectorAll('.unused-checkbox').forEach(cb => {
            cb.addEventListener('change', updateUnusedSelection);
        });
    }

    function updateUnusedSelection() {
        selectedUnusedKeys.clear();
        document.querySelectorAll('.unused-checkbox:checked').forEach(cb => {
            selectedUnusedKeys.add(cb.dataset.key);
        });
        const selectedCountEl = document.getElementById('unused-selected-count');
        if (selectedCountEl) {
            selectedCountEl.textContent = `(${selectedUnusedKeys.size} selected)`;
        }
    }

    function toggleSelectAllUnused(e) {
        const checked = e.target.checked;
        document.querySelectorAll('.unused-checkbox').forEach(cb => {
            cb.checked = checked;
        });

        // Sync both checkboxes
        const selectAll = document.getElementById('select-all-unused');
        const tableSelectAll = document.getElementById('unused-table-select-all');
        if (selectAll) selectAll.checked = checked;
        if (tableSelectAll) tableSelectAll.checked = checked;

        updateUnusedSelection();
    }

    function filterUnusedResults() {
        const filterInput = document.getElementById('unused-filter');
        const namespaceSelect = document.getElementById('unused-namespace');

        const filterText = filterInput ? filterInput.value.toLowerCase() : '';
        const namespace = namespaceSelect ? namespaceSelect.value : '';

        unusedFilteredData = unusedData.filter(item => {
            const keyToSearch = item.fullKey || item.key || '';
            const valueToSearch = item.value || '';

            const matchesFilter = !filterText ||
                keyToSearch.toLowerCase().includes(filterText) ||
                valueToSearch.toLowerCase().includes(filterText);
            const matchesNamespace = !namespace || item.namespace === namespace;
            return matchesFilter && matchesNamespace;
        });

        renderUnusedResults();
    }

    function showUnusedSuccess(message) {
        const successDiv = document.getElementById('unused-success');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        }
    }

    function showUnusedError(message) {
        const errorDiv = document.getElementById('unused-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }

    function clearUnusedResults() {
        const empty = document.getElementById('unused-empty');
        const results = document.getElementById('unused-results');
        const stats = document.getElementById('unused-stats');

        if (empty) {
            empty.style.display = 'block';
            empty.innerHTML = `
                <i class="fas fa-search text-4xl mb-4 text-gray-400"></i>
                <h3 class="text-lg font-semibold mb-2">Ready to Scan</h3>
                <p class="text-gray-600">Click "Scan Unused Keys" to find translation keys that exist in message files but aren't used anywhere in the codebase.</p>
            `;
        }
        if (results) results.style.display = 'none';
        if (stats) stats.style.display = 'none';

        // Disable buttons
        const removeBtn = document.getElementById('remove-unused');
        const clearBtn = document.getElementById('clear-unused');
        const selectAllBtn = document.getElementById('select-all-unused');

        if (removeBtn) removeBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
        if (selectAllBtn) selectAllBtn.disabled = true;

        unusedData = [];
        unusedFilteredData = [];
        selectedUnusedKeys.clear();

        const selectedCountEl = document.getElementById('unused-selected-count');
        if (selectedCountEl) selectedCountEl.textContent = '(0 selected)';
    }

    async function removeSelectedUnused() {
        if (selectedUnusedKeys.size === 0) {
            showUnusedError('Please select keys to remove');
            return;
        }

        const confirmRemove = confirm(
            `Are you sure you want to remove ${selectedUnusedKeys.size} unused translation keys from ALL locale files?\n\n` +
            `This action cannot be undone!`
        );

        if (!confirmRemove) return;

        const removeBtn = document.getElementById('remove-unused');
        const originalBtnText = removeBtn ? removeBtn.innerHTML : '';

        if (removeBtn) {
            removeBtn.disabled = true;
            removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Removing...';
        }

        try {
            // Get selected items with full info
            const keysToRemove = unusedData.filter(item => {
                const keyId = item.fullKey || `${item.namespace}.${item.key}`;
                return selectedUnusedKeys.has(keyId);
            }).map(item => ({
                namespace: item.namespace,
                key: item.key,
                fullKey: item.fullKey || `${item.namespace}.${item.key}`
            }));

            const response = await fetch(`${API_BASE}/api/orphaned/remove-unused`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keys: keysToRemove })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to remove');
            }

            showUnusedSuccess(result.message || `Successfully removed ${selectedUnusedKeys.size} unused keys from all locale files`);

            // Re-scan to update the list
            setTimeout(() => scanUnused(), 2000);
        } catch (error) {
            showUnusedError('Failed to remove: ' + error.message);
        } finally {
            if (removeBtn) {
                removeBtn.disabled = false;
                removeBtn.innerHTML = originalBtnText;
            }
        }
    }

    // Export functions to global scope
    window.orphanedTab = {
        initialize: initializeOrphanedTab,
        scanOrphaned,
        restoreSelected,
        cleanSelected,
        aiSuggestValues,
        clearResults: () => {
            orphanedData = [];
            filteredData = [];
            selectedKeys.clear();
            renderResults();
        },
        // Unused keys functions
        scanUnused,
        removeSelectedUnused,
        clearUnusedResults
    };
})();