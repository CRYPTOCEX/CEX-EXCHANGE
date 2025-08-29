// Locales Management Tab Functionality
(function() {
    let localesData = null;
    let enabledLocales = new Set();
    let defaultLocale = 'en';
    
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        setupEventListeners();
    });

    function initializeLocalesTab() {
        setupEventListeners();
        loadLocalesData();
    }

    function setupEventListeners() {
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-locales');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', handleSelectAll);
        }

        // Save configuration button
        const saveBtn = document.getElementById('save-locale-config');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveLocaleConfiguration);
        }

        // Set default button
        const setDefaultBtn = document.getElementById('set-default-btn');
        if (setDefaultBtn) {
            setDefaultBtn.addEventListener('click', setDefaultLocale);
        }

        // Sync translations button
        const syncBtn = document.getElementById('sync-translations-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', syncTranslations);
        }

        // Find bad keys button
        const findBadKeysBtn = document.getElementById('find-bad-keys-btn');
        if (findBadKeysBtn) {
            findBadKeysBtn.addEventListener('click', findBadKeys);
        }

        // Clean values button
        const cleanValuesBtn = document.getElementById('clean-values-btn');
        if (cleanValuesBtn) {
            cleanValuesBtn.addEventListener('click', cleanValues);
        }

        // Find non-translatable button
        const findNonTranslatableBtn = document.getElementById('find-non-translatable-btn');
        if (findNonTranslatableBtn) {
            findNonTranslatableBtn.addEventListener('click', findNonTranslatable);
        }
    }

    async function loadLocalesData() {
        try {
            // Use shared locale data if available
            if (window.sharedLocalesData) {
                localesData = window.sharedLocalesData;
            } else {
                // Load locale data
                const data = await apiClient.getLocales();
                localesData = data.locales;
            }

            // Load configuration from server (which reads from .env)
            const config = await apiClient.getLocaleConfig();
            
            // Parse enabled locales from configuration
            if (config.enabledLocales) {
                enabledLocales = new Set(config.enabledLocales);
            } else if (localesData) {
                // If no configuration, all existing locales are considered enabled
                enabledLocales = new Set(Object.keys(localesData));
            }

            // Set default locale from configuration
            if (config.defaultLocale) {
                defaultLocale = config.defaultLocale;
            }

            renderLocalesTable();
            updateEnabledCount();
            populateDefaultLocaleSelect();
            
        } catch (error) {
            console.error('Error loading locales data:', error);
            UIUtils.showError('Failed to load locales configuration');
        }
    }

    function renderLocalesTable() {
        const tbody = document.getElementById('locales-table-body');
        if (!tbody) return;

        if (!localesData) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-gray-500">Loading...</td></tr>';
            return;
        }

        const locales = Object.entries(localesData);
        
        const html = locales.map(([code, locale]) => {
            const isEnabled = enabledLocales.has(code);
            const isDefault = code === defaultLocale;
            const progress = locale.progress || 0;
            const progressClass = getProgressClass(progress);
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3">
                        <input type="checkbox" 
                               class="locale-checkbox rounded" 
                               data-locale="${code}"
                               ${isEnabled ? 'checked' : ''}>
                    </td>
                    <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }">
                            ${isEnabled ? 'Yes' : 'No'}
                        </span>
                    </td>
                    <td class="px-4 py-3 font-mono text-sm">${code}</td>
                    <td class="px-4 py-3 font-medium">${locale.name || code}</td>
                    <td class="px-4 py-3">${locale.totalKeys || 0}</td>
                    <td class="px-4 py-3">
                        <span class="text-red-600 font-medium">${locale.missing || 0}</span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="text-yellow-600 font-medium">${locale.identical || 0}</span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="text-green-600 font-medium">${locale.translated || 0}</span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex items-center">
                            <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div class="h-2 rounded-full ${progressClass}" style="width: ${progress}%"></div>
                            </div>
                            <span class="text-sm font-medium">${progress}%</span>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        ${isDefault ? 
                            '<span class="inline-flex px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">Default</span>' : 
                            '-'
                        }
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex space-x-2">
                            <button onclick="localesTab.viewLocale('${code}')" 
                                    class="text-blue-600 hover:text-blue-800 text-sm">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="localesTab.translateLocale('${code}')"
                                    class="text-green-600 hover:text-green-800 text-sm">
                                <i class="fas fa-robot"></i>
                            </button>
                            ${code !== 'en' ? `
                                <button onclick="localesTab.deleteLocale('${code}')"
                                        class="text-red-600 hover:text-red-800 text-sm">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;

        // Add event listeners to checkboxes
        tbody.querySelectorAll('.locale-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleLocaleToggle);
        });
    }

    function populateDefaultLocaleSelect() {
        const select = document.getElementById('default-locale-select');
        if (!select) return;

        const options = Array.from(enabledLocales).map(code => {
            const locale = localesData[code];
            return `<option value="${code}" ${code === defaultLocale ? 'selected' : ''}>
                ${locale?.name || code} (${code})
            </option>`;
        }).join('');

        select.innerHTML = options;
    }

    function handleSelectAll(event) {
        const isChecked = event.target.checked;
        const checkboxes = document.querySelectorAll('.locale-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            const code = checkbox.dataset.locale;
            if (isChecked) {
                enabledLocales.add(code);
            } else {
                enabledLocales.delete(code);
            }
        });

        updateEnabledCount();
    }

    function handleLocaleToggle(event) {
        const code = event.target.dataset.locale;
        
        if (event.target.checked) {
            if (enabledLocales.size >= 12) {
                event.target.checked = false;
                UIUtils.showWarning('Maximum 12 locales can be enabled at once');
                return;
            }
            enabledLocales.add(code);
        } else {
            enabledLocales.delete(code);
        }

        updateEnabledCount();
        populateDefaultLocaleSelect();
    }

    function updateEnabledCount() {
        const countElement = document.getElementById('enabled-count');
        if (countElement) {
            countElement.textContent = enabledLocales.size;
            
            // Update color based on count
            if (enabledLocales.size > 10) {
                countElement.classList.add('text-red-600');
                countElement.classList.remove('text-yellow-600', 'text-green-600');
            } else if (enabledLocales.size > 8) {
                countElement.classList.add('text-yellow-600');
                countElement.classList.remove('text-red-600', 'text-green-600');
            } else {
                countElement.classList.add('text-green-600');
                countElement.classList.remove('text-red-600', 'text-yellow-600');
            }
        }
    }

    async function saveLocaleConfiguration() {
        try {
            UIUtils.showInfo('Saving locale configuration...');

            const config = {
                enabledLocales: Array.from(enabledLocales),
                defaultLocale: defaultLocale
            };

            await apiClient.saveLocaleConfig(config);
            
            UIUtils.showSuccess('Locale configuration saved. Restart the application for changes to take effect.');
            
        } catch (error) {
            console.error('Error saving configuration:', error);
            UIUtils.showError('Failed to save locale configuration');
        }
    }

    async function setDefaultLocale() {
        const select = document.getElementById('default-locale-select');
        if (!select) return;

        defaultLocale = select.value;
        renderLocalesTable();
        
        UIUtils.showInfo(`Default locale set to ${defaultLocale}. Save configuration to persist changes.`);
    }

    async function syncTranslations() {
        if (!confirm('Sync all translations? This will add missing keys from English to all enabled locales.')) {
            return;
        }

        try {
            UIUtils.showInfo('Syncing translations...');

            const result = await apiClient.syncTranslations(Array.from(enabledLocales));
            
            UIUtils.showSuccess(`Synced ${result.keysAdded || 0} keys across ${result.localesUpdated || 0} locales`);
            
            // Reload data to show updated stats
            await loadLocalesData();
            
        } catch (error) {
            console.error('Error syncing translations:', error);
            UIUtils.showError('Failed to sync translations');
        }
    }

    async function findBadKeys() {
        try {
            UIUtils.showInfo('Scanning for bad keys...');

            const result = await apiClient.findBadKeys();
            
            if (result.badKeys && result.badKeys.length > 0) {
                console.log('Bad keys found:', result.badKeys);
                UIUtils.showWarning(`Found ${result.badKeys.length} problematic keys. Check console for details.`);
            } else {
                UIUtils.showSuccess('No problematic keys found!');
            }
            
        } catch (error) {
            console.error('Error finding bad keys:', error);
            UIUtils.showError('Failed to scan for bad keys');
        }
    }

    async function cleanValues() {
        if (!confirm('Clean all translation values? This will fix formatting issues but may modify translations.')) {
            return;
        }

        try {
            UIUtils.showInfo('Cleaning translation values...');

            const result = await apiClient.cleanValues(Array.from(enabledLocales));
            
            UIUtils.showSuccess(`Cleaned ${result.valuesFixed || 0} values across ${result.localesUpdated || 0} locales`);
            
        } catch (error) {
            console.error('Error cleaning values:', error);
            UIUtils.showError('Failed to clean values');
        }
    }

    async function findNonTranslatable() {
        try {
            UIUtils.showInfo('Finding non-translatable keys...');

            const result = await apiClient.findNonTranslatable();
            
            if (result.nonTranslatable && result.nonTranslatable.length > 0) {
                console.log('Non-translatable keys found:', result.nonTranslatable);
                
                if (confirm(`Found ${result.nonTranslatable.length} non-translatable keys. Remove them from all locales?`)) {
                    await removeNonTranslatableKeys(result.nonTranslatable);
                } else {
                    UIUtils.showInfo(`Found ${result.nonTranslatable.length} non-translatable keys. Check console for details.`);
                }
            } else {
                UIUtils.showSuccess('No non-translatable keys found!');
            }
            
        } catch (error) {
            console.error('Error finding non-translatable keys:', error);
            UIUtils.showError('Failed to find non-translatable keys');
        }
    }

    async function removeNonTranslatableKeys(keys) {
        try {
            UIUtils.showInfo('Removing non-translatable keys...');

            const result = await apiClient.removeNonTranslatable(keys, Array.from(enabledLocales));
            
            UIUtils.showSuccess(`Removed ${result.keysRemoved || 0} keys from ${result.localesUpdated || 0} locales`);
            
            // Reload data to show updated stats
            await loadLocalesData();
            
        } catch (error) {
            console.error('Error removing non-translatable keys:', error);
            UIUtils.showError('Failed to remove non-translatable keys');
        }
    }

    function viewLocale(code) {
        // Navigate to translation editor with selected locale
        router.navigateTo('translations');
        
        // Set locale in translation editor after a short delay
        setTimeout(() => {
            if (window.translationEditor) {
                translationEditor.setCurrentLocale(code);
            }
        }, 100);
    }

    async function translateLocale(code) {
        try {
            UIUtils.showInfo(`Starting AI translation for ${localesData[code]?.name || code}...`);
            
            // Start batch translation for missing keys
            await apiClient.startBatchTranslation(code, 'missing', 'all', 10);
            
            // Navigate to AI translate tab
            router.navigateTo('ai-translate');
            
        } catch (error) {
            console.error('Error starting translation:', error);
            UIUtils.showError('Failed to start translation');
        }
    }

    async function deleteLocale(code) {
        if (!confirm(`Delete locale ${code}? This will remove the translation file permanently.`)) {
            return;
        }

        try {
            UIUtils.showInfo(`Deleting locale ${code}...`);

            await apiClient.deleteLocale(code);
            
            UIUtils.showSuccess(`Locale ${code} deleted successfully`);
            
            // Remove from enabled locales
            enabledLocales.delete(code);
            
            // Reload data
            await loadLocalesData();
            
        } catch (error) {
            console.error('Error deleting locale:', error);
            UIUtils.showError('Failed to delete locale');
        }
    }

    function getProgressClass(progress) {
        if (progress >= 90) return 'bg-green-500';
        if (progress >= 70) return 'bg-yellow-500';
        if (progress >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    }

    // Export functions to global scope
    window.localesTab = {
        initialize: initializeLocalesTab,
        viewLocale,
        translateLocale,
        deleteLocale,
        refresh: loadLocalesData
    };

})();