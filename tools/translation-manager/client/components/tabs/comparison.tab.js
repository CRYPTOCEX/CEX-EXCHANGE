// Comparison Tool Tab Functionality
(function() {
    let availableLocales = [];
    let comparisonResult = null;
    let identicalItems = [];
    
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    // Initialize when DOM is ready (setup event listeners only - don't load data)
    document.addEventListener('DOMContentLoaded', function() {
        // Don't auto-initialize, wait for router to call it
        // initializeComparisonTab();
    });

    function initializeComparisonTab() {
        setupEventListeners();
        
        // Use shared data if available
        if (window.sharedLocalesData) {
            availableLocales = Object.entries(window.sharedLocalesData).map(([code, locale]) => ({
                code,
                ...locale
            }));
            renderLocaleSelectors();
        } else {
            loadLocales();
        }
    }

    function setupEventListeners() {
        // Compare button
        const compareBtn = document.getElementById('compare-locales-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', compareLocales);
        }

        // Find identical button
        const identicalBtn = document.getElementById('find-identical-btn');
        if (identicalBtn) {
            identicalBtn.addEventListener('click', findIdentical);
        }

        // Remove identical button
        const removeBtn = document.getElementById('remove-identical-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', removeIdentical);
        }

        // Clear results button
        const clearBtn = document.getElementById('clear-comparison');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearResults);
        }

        // Export buttons
        const exportBtn = document.getElementById('export-comparison');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportResults);
        }

        // Locale selection change
        const sourceSelect = document.getElementById('source-locale');
        const targetSelect = document.getElementById('target-locale');
        
        if (sourceSelect) {
            sourceSelect.addEventListener('change', updateComparisonStats);
        }
        if (targetSelect) {
            targetSelect.addEventListener('change', updateComparisonStats);
        }

        // Search functionality
        const searchInput = document.getElementById('comparison-search');
        if (searchInput) {
            searchInput.addEventListener('input', UIUtils.debounce(onSearch, 300));
        }

        // Category filter
        const categoryFilter = document.getElementById('comparison-category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', onCategoryFilter);
        }
    }

    async function loadLocales() {
        try {
            // Use shared locale data if available
            let data;
            if (window.sharedLocalesData) {
                data = { locales: window.sharedLocalesData };
            } else {
                // Fallback - load if not available
                data = await apiClient.getLocales();
            }
            availableLocales = Object.entries(data.locales).map(([code, locale]) => ({
                code,
                ...locale
            }));
            
            renderLocaleSelects();
            
        } catch (error) {
            console.error('Error loading locales:', error);
            UIUtils.showError('Failed to load locales');
        }
    }

    function renderLocaleSelects() {
        const sourceSelect = document.getElementById('source-locale');
        const targetSelect = document.getElementById('target-locale');
        
        if (!sourceSelect || !targetSelect) return;

        const options = availableLocales.map(locale => 
            `<option value="${locale.code}">${locale.name} (${locale.code})</option>`
        ).join('');

        sourceSelect.innerHTML = `<option value="">Select source locale...</option>${options}`;
        targetSelect.innerHTML = `<option value="">Select target locale...</option>${options}`;
        
        // Set default values
        if (availableLocales.length > 0) {
            sourceSelect.value = 'en'; // Default to English
            
            // Set target to first non-English locale
            const firstNonEn = availableLocales.find(l => l.code !== 'en');
            if (firstNonEn) {
                targetSelect.value = firstNonEn.code;
            }
        }
    }

    async function compareLocales() {
        const sourceLocale = document.getElementById('source-locale')?.value;
        const targetLocale = document.getElementById('target-locale')?.value;
        
        if (!sourceLocale || !targetLocale) {
            UIUtils.showWarning('Please select both source and target locales');
            return;
        }
        
        if (sourceLocale === targetLocale) {
            UIUtils.showWarning('Source and target locales must be different');
            return;
        }
        
        const compareBtn = document.getElementById('compare-locales-btn');
        if (compareBtn) {
            compareBtn.disabled = true;
            compareBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Comparing...';
        }
        
        try {
            UIUtils.showInfo('Comparing locales...');
            
            const data = await apiClient.compareLocales(sourceLocale, targetLocale);
            comparisonResult = data;
            
            renderComparisonResults();
            renderComparisonStats();
            
            UIUtils.showSuccess(`Comparison completed: ${data.stats.total} keys analyzed`);
            
        } catch (error) {
            console.error('Error comparing locales:', error);
            UIUtils.showError('Failed to compare locales');
        } finally {
            if (compareBtn) {
                compareBtn.disabled = false;
                compareBtn.innerHTML = '<i class="fas fa-balance-scale mr-2"></i>Compare Locales';
            }
        }
    }

    async function findIdentical() {
        const sourceLocale = document.getElementById('source-locale')?.value || 'en';
        const targetLocale = document.getElementById('target-locale')?.value;
        
        if (!targetLocale) {
            UIUtils.showWarning('Please select a target locale');
            return;
        }
        
        const findBtn = document.getElementById('find-identical-btn');
        if (findBtn) {
            findBtn.disabled = true;
            findBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Finding...';
        }
        
        try {
            UIUtils.showInfo('Finding identical values...');
            
            const data = await apiClient.findIdentical(sourceLocale, targetLocale);
            identicalItems = data.items || [];
            
            renderIdenticalItems();
            
            UIUtils.showSuccess(`Found ${identicalItems.length} identical items`);
            
        } catch (error) {
            console.error('Error finding identical values:', error);
            UIUtils.showError('Failed to find identical values');
        } finally {
            if (findBtn) {
                findBtn.disabled = false;
                findBtn.innerHTML = '<i class="fas fa-copy mr-2"></i>Find Identical';
            }
        }
    }

    function renderComparisonResults() {
        if (!comparisonResult) return;
        
        const container = document.getElementById('comparison-results');
        if (!container) return;

        const { comparison } = comparisonResult;
        
        // Create tabs for different categories
        const html = `
            <div class="comparison-tabs">
                <div class="tab-buttons flex border-b mb-4">
                    <button class="tab-btn active px-4 py-2 border-b-2 border-blue-500" data-tab="missing">
                        Missing (${comparison.missing?.length || 0})
                    </button>
                    <button class="tab-btn px-4 py-2 text-gray-600" data-tab="identical">
                        Identical (${comparison.identical?.length || 0})
                    </button>
                    <button class="tab-btn px-4 py-2 text-gray-600" data-tab="different">
                        Different (${comparison.different?.length || 0})
                    </button>
                </div>
                
                <div class="tab-content">
                    <div class="tab-panel active" data-panel="missing">
                        ${renderComparisonItems(comparison.missing || [], 'missing')}
                    </div>
                    <div class="tab-panel hidden" data-panel="identical">
                        ${renderComparisonItems(comparison.identical || [], 'identical')}
                    </div>
                    <div class="tab-panel hidden" data-panel="different">
                        ${renderComparisonItems(comparison.different || [], 'different')}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        
        // Setup tab switching
        setupComparisonTabs();
    }

    function renderComparisonItems(items, type) {
        if (items.length === 0) {
            return '<p class="text-gray-500 text-center py-8">No items found</p>';
        }
        
        return items.map(item => {
            switch (type) {
                case 'missing':
                    return `
                        <div class="comparison-item bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
                            <div class="font-medium text-red-900 mb-2">${item.key}</div>
                            <div class="text-sm">
                                <div class="text-red-700">
                                    <strong>Source value:</strong> ${item.sourceValue || 'N/A'}
                                </div>
                                <div class="text-red-600 mt-1">
                                    <strong>Status:</strong> Missing in target locale
                                </div>
                            </div>
                        </div>
                    `;
                    
                case 'identical':
                    return `
                        <div class="comparison-item bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                            <div class="font-medium text-yellow-900 mb-2">${item.key}</div>
                            <div class="text-sm text-yellow-700">
                                <strong>Value:</strong> ${item.value || 'N/A'}
                            </div>
                        </div>
                    `;
                    
                case 'different':
                    return `
                        <div class="comparison-item bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                            <div class="font-medium text-green-900 mb-2">${item.key}</div>
                            <div class="text-sm">
                                <div class="text-green-700 mb-1">
                                    <strong>Source:</strong> ${item.sourceValue || 'N/A'}
                                </div>
                                <div class="text-green-600">
                                    <strong>Target:</strong> ${item.targetValue || 'N/A'}
                                </div>
                            </div>
                        </div>
                    `;
            }
        }).join('');
    }

    function setupComparisonTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                
                // Update button states
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active', 'border-blue-500', 'text-blue-600');
                    b.classList.add('text-gray-600');
                });
                e.target.classList.add('active', 'border-blue-500', 'text-blue-600');
                e.target.classList.remove('text-gray-600');
                
                // Update panel states
                document.querySelectorAll('.tab-panel').forEach(panel => {
                    panel.classList.add('hidden');
                    panel.classList.remove('active');
                });
                
                const targetPanel = document.querySelector(`[data-panel="${tabName}"]`);
                if (targetPanel) {
                    targetPanel.classList.remove('hidden');
                    targetPanel.classList.add('active');
                }
            });
        });
    }

    function renderComparisonStats() {
        if (!comparisonResult) return;
        
        const container = document.getElementById('comparison-stats');
        if (!container) return;

        const { stats, source, target } = comparisonResult;
        
        const html = `
            <div class="stats-header mb-4">
                <h3 class="text-lg font-semibold">Comparison: ${source} → ${target}</h3>
            </div>
            
            <div class="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="stat-card bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-blue-600">${stats.total}</div>
                    <div class="text-sm text-blue-700">Total Keys</div>
                </div>
                
                <div class="stat-card bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-red-600">${stats.missing}</div>
                    <div class="text-sm text-red-700">Missing</div>
                </div>
                
                <div class="stat-card bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-yellow-600">${stats.identical}</div>
                    <div class="text-sm text-yellow-700">Identical</div>
                </div>
                
                <div class="stat-card bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-green-600">${stats.different}</div>
                    <div class="text-sm text-green-700">Different</div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function renderIdenticalItems() {
        const container = document.getElementById('identical-items-results');
        if (!container) return;

        if (identicalItems.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No identical items found</p>';
            return;
        }

        const html = identicalItems.map(item => `
            <div class="identical-item bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <div class="font-medium text-gray-900 break-all">${item.key}</div>
                    <button class="text-red-600 hover:text-red-800 text-sm" 
                            onclick="comparisonTool.removeIdenticalItem('${item.key}')">
                        Remove
                    </button>
                </div>
                <div class="text-sm text-gray-600">
                    <strong>Value:</strong> ${item.value}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async function removeIdentical() {
        const targetLocale = document.getElementById('target-locale')?.value;
        
        if (!targetLocale) {
            UIUtils.showWarning('Please select a target locale');
            return;
        }
        
        if (identicalItems.length === 0) {
            UIUtils.showWarning('No identical items to remove');
            return;
        }
        
        if (!confirm(`Remove all ${identicalItems.length} identical items from ${targetLocale}?`)) {
            return;
        }
        
        try {
            const keys = identicalItems.map(item => item.key);
            
            UIUtils.showInfo('Removing identical items...');
            
            const result = await apiClient.removeNonTranslatable(keys, targetLocale);
            
            UIUtils.showSuccess(`Removed ${result.removed || 0} identical items`);
            
            // Clear results
            identicalItems = [];
            renderIdenticalItems();
            
        } catch (error) {
            console.error('Error removing identical items:', error);
            UIUtils.showError('Failed to remove identical items');
        }
    }

    async function removeIdenticalItem(key) {
        const targetLocale = document.getElementById('target-locale')?.value;
        
        if (!targetLocale) {
            UIUtils.showWarning('Please select a target locale');
            return;
        }
        
        try {
            await apiClient.removeNonTranslatable([key], targetLocale);
            
            // Remove from local array
            identicalItems = identicalItems.filter(item => item.key !== key);
            renderIdenticalItems();
            
            UIUtils.showSuccess(`Removed identical item: ${key}`);
            
        } catch (error) {
            console.error('Error removing identical item:', error);
            UIUtils.showError('Failed to remove identical item');
        }
    }

    function onSearch(event) {
        const query = event.target.value.toLowerCase();
        // Implement search filtering for current results
        // This would filter the currently displayed comparison or identical items
    }

    function onCategoryFilter(event) {
        const category = event.target.value;
        // Implement category filtering for current results
    }

    function updateComparisonStats() {
        // Update any preview stats when locale selection changes
        const sourceLocale = document.getElementById('source-locale')?.value;
        const targetLocale = document.getElementById('target-locale')?.value;
        
        if (sourceLocale && targetLocale && sourceLocale !== targetLocale) {
            const sourceData = availableLocales.find(l => l.code === sourceLocale);
            const targetData = availableLocales.find(l => l.code === targetLocale);
            
            // Could show preview stats here
        }
    }

    function clearResults() {
        comparisonResult = null;
        identicalItems = [];
        
        const resultsContainer = document.getElementById('comparison-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Click "Compare Locales" to analyze differences</p>';
        }
        
        const statsContainer = document.getElementById('comparison-stats');
        if (statsContainer) {
            statsContainer.innerHTML = '';
        }
        
        const identicalContainer = document.getElementById('identical-items-results');
        if (identicalContainer) {
            identicalContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Click "Find Identical" to find identical values</p>';
        }
        
        UIUtils.showSuccess('Results cleared');
    }

    function exportResults() {
        if (!comparisonResult && identicalItems.length === 0) {
            UIUtils.showWarning('No results to export');
            return;
        }
        
        const data = {
            comparison: comparisonResult,
            identicalItems: identicalItems,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation-comparison-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        UIUtils.showSuccess('Comparison results exported');
    }

    // Export functions to global scope
    window.comparisonTool = {
        initialize: initializeComparisonTab,
        compareLocales,
        findIdentical,
        removeIdentical,
        removeIdenticalItem,
        clearResults,
        exportResults,
        refresh: () => {
            loadLocales();
        }
    };

})();