// Orphaned Translations Tab Functionality
(function() {
    let orphanedData = [];
    let filteredData = [];
    let selectedKeys = new Set();
    
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
                
                if (restoreBtn) restoreBtn.disabled = false;
                if (cleanBtn) cleanBtn.disabled = false;
                if (clearBtn) clearBtn.disabled = false;
                if (selectAllBtn) selectAllBtn.disabled = false;
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
            
            tr.innerHTML = `
                <td class="border p-2">
                    <input type="checkbox" class="orphaned-checkbox" data-key="${keyIdentifier}" 
                           ${selectedKeys.has(keyIdentifier) ? 'checked' : ''}>
                </td>
                <td class="border p-2">${displayNamespace}</td>
                <td class="border p-2 font-mono text-sm">${displayKey}</td>
                <td class="border p-2">${item.suggestedValue || item.value || ''}</td>
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
            // Extract just the keys from selected items
            const keysToRestore = selectedItems.map(item => item.fullKey || item.key);
            
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
        
        if (empty) empty.style.display = 'block';
        if (results) results.style.display = 'none';
        if (stats) stats.style.display = 'none';
        if (restoreBtn) restoreBtn.disabled = true;
        if (cleanBtn) cleanBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
        if (selectAllBtn) selectAllBtn.disabled = true;
        
        orphanedData = [];
        filteredData = [];
        selectedKeys.clear();
    }

    function showSuccess(message) {
        const successDiv = document.getElementById('orphaned-success');
        if (successDiv) {
            successDiv.textContent = message;
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
    
    function showInfo(message) {
        // Use success div with different styling for info messages
        const successDiv = document.getElementById('orphaned-success');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            // Don't auto-hide info messages during operations
        }
    }
    
    // Export functions to global scope
    window.orphanedTab = {
        initialize: initializeOrphanedTab,
        scanOrphaned,
        restoreSelected,
        cleanSelected,
        clearResults: () => {
            orphanedData = [];
            filteredData = [];
            selectedKeys.clear();
            renderResults();
        }
    };
})();