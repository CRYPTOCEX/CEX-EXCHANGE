// Untranslatable Texts Tab Functionality
(function() {
    let untranslatableData = [];
    let filteredData = [];
    let selectedItems = new Set();
    let patternConfig = null;
    
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Don't auto-initialize, wait for router to call it
        // initializeUntranslatableTab();
    });

    function initializeUntranslatableTab() {
        setupEventListeners();
        loadPatternConfig();
    }

    function setupEventListeners() {
        // Scan button
        const scanBtn = document.getElementById('scan-untranslatable');
        if (scanBtn) {
            scanBtn.addEventListener('click', scanUntranslatable);
        }

        // Clean buttons
        const cleanSelectedBtn = document.getElementById('clean-selected-untranslatable');
        if (cleanSelectedBtn) {
            cleanSelectedBtn.addEventListener('click', cleanSelected);
        }

        const cleanAllBtn = document.getElementById('clean-all-untranslatable');
        if (cleanAllBtn) {
            cleanAllBtn.addEventListener('click', cleanAll);
        }

        // Clear button
        const clearBtn = document.getElementById('clear-untranslatable');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearResults);
        }

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-untranslatable');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', toggleSelectAll);
        }

        // Search/filter
        const searchInput = document.getElementById('search-untranslatable');
        if (searchInput) {
            searchInput.addEventListener('input', UIUtils.debounce(onSearch, 300));
        }

        // Type filter
        const typeFilter = document.getElementById('type-filter-untranslatable');
        if (typeFilter) {
            typeFilter.addEventListener('change', onTypeFilter);
        }

        // Pattern management buttons
        const addPatternBtn = document.getElementById('add-custom-pattern');
        if (addPatternBtn) {
            addPatternBtn.addEventListener('click', showAddPatternModal);
        }

        // Refresh patterns button
        const refreshPatternsBtn = document.getElementById('refresh-patterns');
        if (refreshPatternsBtn) {
            refreshPatternsBtn.addEventListener('click', loadPatternConfig);
        }
    }

    async function loadPatternConfig() {
        try {
            const data = await apiClient.getUntranslatableConfig();
            patternConfig = data;
            renderPatternConfig();
        } catch (error) {
            console.error('Error loading pattern config:', error);
            UIUtils.showError('Failed to load pattern configuration');
        }
    }

    function renderPatternConfig() {
        const container = document.getElementById('pattern-config-list');
        if (!container) return;

        const allPatterns = [
            ...(patternConfig.patterns || []),
            ...(patternConfig.customPatterns || [])
        ];

        if (allPatterns.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No patterns configured</p>';
            return;
        }

        const html = allPatterns.map(pattern => {
            const isCustom = !patternConfig.patterns.some(p => p.id === pattern.id);
            
            return `
                <div class="pattern-item bg-white rounded-lg border p-4 ${pattern.enabled === false ? 'opacity-50' : ''}">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-gray-900">${pattern.name || pattern.id}</h4>
                        <div class="flex items-center space-x-2">
                            <button class="text-sm ${pattern.enabled !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} px-2 py-1 rounded"
                                    onclick="untranslatableManager.togglePattern('${pattern.id}')">
                                ${pattern.enabled !== false ? 'Enabled' : 'Disabled'}
                            </button>
                            ${isCustom ? `
                                <button class="text-red-600 hover:text-red-800" 
                                        onclick="untranslatableManager.deletePattern('${pattern.id}')"
                                        title="Delete custom pattern">
                                    <i class="fas fa-trash text-sm"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="text-sm text-gray-600 mb-2">
                        <strong>Pattern:</strong> <code class="bg-gray-100 px-1 rounded">${pattern.pattern}</code>
                    </div>
                    
                    <div class="text-sm text-gray-600 mb-2">
                        <strong>Category:</strong> ${pattern.category || 'Unknown'}
                        <strong class="ml-4">Replacement:</strong> ${pattern.replacement || 'None'}
                    </div>
                    
                    ${pattern.description ? `
                        <div class="text-sm text-gray-500">
                            ${pattern.description}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    async function scanUntranslatable() {
        const scanBtn = document.getElementById('scan-untranslatable');
        if (scanBtn) {
            scanBtn.disabled = true;
            scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Scanning...';
        }

        try {
            UIUtils.showInfo('Scanning for untranslatable texts...');
            
            const data = await apiClient.scanUntranslatable();
            untranslatableData = data.items || [];
            filteredData = [...untranslatableData];
            selectedItems.clear();
            
            renderResults();
            renderStats(data.stats || {});
            renderTypeFilter();
            
            UIUtils.showSuccess(`Found ${untranslatableData.length} untranslatable items`);
            
        } catch (error) {
            console.error('Error scanning untranslatable texts:', error);
            UIUtils.showError('Failed to scan untranslatable texts');
        } finally {
            if (scanBtn) {
                scanBtn.disabled = false;
                scanBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Scan Untranslatable';
            }
        }
    }

    function renderResults() {
        const container = document.getElementById('untranslatable-results');
        if (!container) return;

        if (filteredData.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No untranslatable items found</p>';
            return;
        }

        const html = filteredData.map(item => {
            const isSelected = selectedItems.has(item.key);
            const typeColor = getTypeColor(item.type);
            
            return `
                <div class="untranslatable-item bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}">
                    <div class="flex items-start justify-between mb-2">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" class="mr-2" ${isSelected ? 'checked' : ''}
                                   onchange="untranslatableManager.toggleItemSelection('${item.key}', this.checked)">
                            <span class="font-medium text-sm break-all">${item.key}</span>
                        </label>
                        <div class="flex items-center space-x-2">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeColor}">
                                ${item.type}
                            </span>
                            <span class="text-xs text-gray-500">
                                ${item.identicalIn}/${item.totalLocales} identical
                            </span>
                        </div>
                    </div>
                    
                    <div class="text-sm mb-2">
                        <strong>Current:</strong> 
                        <span class="bg-gray-100 px-2 py-1 rounded font-mono text-xs">${item.value}</span>
                    </div>
                    
                    <div class="text-sm mb-2">
                        <strong>Suggested:</strong> 
                        <span class="bg-green-100 px-2 py-1 rounded font-mono text-xs">${item.suggestedReplacement}</span>
                    </div>
                    
                    <div class="text-xs text-gray-500">
                        Pattern: ${item.matchedPattern || 'Unknown'}
                        • ${item.percentIdentical}% identical across locales
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function renderStats(stats) {
        const container = document.getElementById('untranslatable-stats');
        if (!container) return;

        const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
        
        const html = Object.entries(stats).map(([type, count]) => {
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            const typeColor = getTypeColor(type);
            
            return `
                <div class="stat-item bg-white rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-gray-900">${count}</div>
                    <div class="text-sm text-gray-600 capitalize">${type}</div>
                    <div class="text-xs text-gray-500">${percentage}%</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function renderTypeFilter() {
        const select = document.getElementById('type-filter-untranslatable');
        if (!select) return;

        const types = [...new Set(untranslatableData.map(item => item.type))].sort();
        
        const options = types.map(type => 
            `<option value="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</option>`
        ).join('');

        select.innerHTML = `
            <option value="">All Types</option>
            ${options}
        `;
    }

    function onSearch(event) {
        const query = event.target.value.toLowerCase();
        applyFilters(query);
    }

    function onTypeFilter(event) {
        const selectedType = event.target.value;
        const searchQuery = document.getElementById('search-untranslatable')?.value.toLowerCase() || '';
        applyFilters(searchQuery, selectedType);
    }

    function applyFilters(searchQuery = '', typeFilter = '') {
        filteredData = untranslatableData.filter(item => {
            const matchesSearch = !searchQuery || 
                item.key.toLowerCase().includes(searchQuery) ||
                item.value.toLowerCase().includes(searchQuery);
            
            const matchesType = !typeFilter || item.type === typeFilter;
            
            return matchesSearch && matchesType;
        });
        
        renderResults();
    }

    function toggleSelectAll(event) {
        const checked = event.target.checked;
        
        if (checked) {
            filteredData.forEach(item => selectedItems.add(item.key));
        } else {
            selectedItems.clear();
        }
        
        renderResults();
        updateSelectionUI();
    }

    function toggleItemSelection(key, selected) {
        if (selected) {
            selectedItems.add(key);
        } else {
            selectedItems.delete(key);
        }
        
        updateSelectionUI();
    }

    function updateSelectionUI() {
        const selectAllCheckbox = document.getElementById('select-all-untranslatable');
        if (selectAllCheckbox) {
            const totalVisible = filteredData.length;
            const selectedVisible = filteredData.filter(item => selectedItems.has(item.key)).length;
            
            selectAllCheckbox.checked = totalVisible > 0 && selectedVisible === totalVisible;
            selectAllCheckbox.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible;
        }
        
        // Update button states
        const hasSelection = selectedItems.size > 0;
        const cleanSelectedBtn = document.getElementById('clean-selected-untranslatable');
        if (cleanSelectedBtn) {
            cleanSelectedBtn.disabled = !hasSelection;
        }
    }

    async function cleanSelected() {
        if (selectedItems.size === 0) {
            UIUtils.showWarning('No items selected');
            return;
        }
        
        const selectedData = untranslatableData.filter(item => selectedItems.has(item.key));
        await performCleanup(selectedData, `${selectedItems.size} selected items`);
    }

    async function cleanAll() {
        if (untranslatableData.length === 0) {
            UIUtils.showWarning('No items to clean');
            return;
        }
        
        if (!confirm(`Clean all ${untranslatableData.length} untranslatable items?`)) {
            return;
        }
        
        await performCleanup(untranslatableData, 'all items');
    }

    async function performCleanup(items, description) {
        try {
            UIUtils.showInfo(`Cleaning ${description}...`);
            
            const result = await apiClient.cleanUntranslatable(items);
            
            let message = `Cleaned ${description} successfully`;
            if (result.results) {
                const totalReplaced = Object.values(result.results.replaced || {})
                    .reduce((sum, count) => sum + count, 0);
                message += ` (${totalReplaced} replacements made)`;
            }
            
            UIUtils.showSuccess(message);
            
            // Clear selection and refresh
            selectedItems.clear();
            clearResults();
            
        } catch (error) {
            console.error('Error cleaning untranslatable texts:', error);
            UIUtils.showError('Failed to clean untranslatable texts');
        }
    }

    function clearResults() {
        untranslatableData = [];
        filteredData = [];
        selectedItems.clear();
        
        const container = document.getElementById('untranslatable-results');
        if (container) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Click "Scan Untranslatable" to find items</p>';
        }
        
        const statsContainer = document.getElementById('untranslatable-stats');
        if (statsContainer) {
            statsContainer.innerHTML = '';
        }
        
        updateSelectionUI();
        UIUtils.showSuccess('Results cleared');
    }

    async function togglePattern(patternId) {
        try {
            await apiClient.toggleUntranslatablePattern(patternId);
            UIUtils.showSuccess('Pattern toggled');
            loadPatternConfig();
        } catch (error) {
            console.error('Error toggling pattern:', error);
            UIUtils.showError('Failed to toggle pattern');
        }
    }

    async function deletePattern(patternId) {
        if (!confirm('Are you sure you want to delete this custom pattern?')) {
            return;
        }
        
        try {
            await apiClient.deleteUntranslatablePattern(patternId);
            UIUtils.showSuccess('Pattern deleted');
            loadPatternConfig();
        } catch (error) {
            console.error('Error deleting pattern:', error);
            UIUtils.showError('Failed to delete pattern');
        }
    }

    function showAddPatternModal() {
        // Simple prompt-based pattern addition (can be enhanced with a proper modal)
        const name = prompt('Pattern name:');
        if (!name) return;
        
        const pattern = prompt('Regular expression pattern:');
        if (!pattern) return;
        
        const category = prompt('Category (e.g., custom, symbol, etc.):') || 'custom';
        const replacement = prompt('Replacement value (empty, space, self, etc.):') || 'self';
        
        addCustomPattern({
            id: Date.now().toString(),
            name: name,
            pattern: pattern,
            category: category,
            replacement: replacement,
            enabled: true,
            description: `Custom pattern: ${name}`
        });
    }

    async function addCustomPattern(patternData) {
        try {
            await apiClient.addUntranslatablePattern(patternData);
            UIUtils.showSuccess('Custom pattern added');
            loadPatternConfig();
        } catch (error) {
            console.error('Error adding custom pattern:', error);
            UIUtils.showError('Failed to add custom pattern');
        }
    }

    function getTypeColor(type) {
        const colors = {
            placeholder: 'bg-blue-100 text-blue-800',
            underscore: 'bg-purple-100 text-purple-800',
            symbol: 'bg-orange-100 text-orange-800',
            number: 'bg-green-100 text-green-800',
            single: 'bg-yellow-100 text-yellow-800',
            emoji: 'bg-pink-100 text-pink-800',
            special: 'bg-red-100 text-red-800',
            whitespace: 'bg-gray-100 text-gray-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    }

    // Export functions to global scope
    window.untranslatableManager = {
        initialize: initializeUntranslatableTab,
        scanUntranslatable,
        cleanSelected,
        cleanAll,
        clearResults,
        toggleItemSelection,
        togglePattern,
        deletePattern,
        addCustomPattern,
        refresh: () => {
            loadPatternConfig();
            if (untranslatableData.length > 0) {
                scanUntranslatable();
            }
        }
    };

})();