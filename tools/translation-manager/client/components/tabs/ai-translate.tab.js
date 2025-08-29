// AI Translation Tab Functionality
(function() {
    let availableLocales = new Map();
    let activeTranslations = new Map();
    
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    // Initialize when DOM is ready (but don't auto-load data)
    document.addEventListener('DOMContentLoaded', function() {
        setupEventListeners();
    });

    let refreshInterval = null;
    
    function initializeAITranslateTab() {
        setupEventListeners();
        
        // Use shared data if available
        if (window.sharedLocalesData) {
            availableLocales.clear();
            Object.entries(window.sharedLocalesData).forEach(([code, locale]) => {
                availableLocales.set(code, locale);
            });
            renderLocaleGrid();
            renderLocaleCheckboxes();
            updateEstimates();
        } else {
            loadLocales();
        }
        
        loadActiveTranslations();
        
        // Only start interval if this tab is active
        startActiveTranslationsRefresh();
    }
    
    window.startActiveTranslationsRefresh = function() {
        // Clear any existing interval
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        
        // Only start if the ai-translate tab is currently active
        if (isTabActive()) {
            refreshInterval = setInterval(() => {
                if (isTabActive()) {
                    loadActiveTranslations();
                } else {
                    stopActiveTranslationsRefresh();
                }
            }, 5000);
        }
    }
    
    window.stopActiveTranslationsRefresh = function() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }
    
    function isTabActive() {
        const tab = document.getElementById('ai-translate-tab');
        return tab && !tab.classList.contains('hidden');
    }

    function setupEventListeners() {
        // Start translation button
        const startBtn = document.getElementById('start-ai-translation');
        if (startBtn) {
            startBtn.addEventListener('click', startTranslation);
        }

        // Stop all button
        const stopAllBtn = document.getElementById('stop-all-translations');
        if (stopAllBtn) {
            stopAllBtn.addEventListener('click', stopAllTranslations);
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-translations');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadLocales();
                loadActiveTranslations();
            });
        }

        // Locale selection change
        const localeSelect = document.getElementById('ai-locale-select');
        if (localeSelect) {
            localeSelect.addEventListener('change', onLocaleSelectionChange);
        }

        // Mode selection
        const modeRadios = document.querySelectorAll('input[name="translation-mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', onModeChange);
        });

        // Priority selection
        const prioritySelect = document.getElementById('priority-select');
        if (prioritySelect) {
            prioritySelect.addEventListener('change', updateEstimates);
        }

        // Batch size change
        const batchSizeInput = document.getElementById('batch-size');
        if (batchSizeInput) {
            batchSizeInput.addEventListener('input', updateEstimates);
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
            availableLocales.clear();
            
            Object.entries(data.locales).forEach(([code, locale]) => {
                availableLocales.set(code, locale);
            });
            
            renderLocaleGrid();
            renderLocaleCheckboxes();
            renderLocaleSelect();
            
        } catch (error) {
            console.error('Error loading locales:', error);
            UIUtils.showError('Failed to load locales');
        }
    }

    function renderLocaleCheckboxes() {
        const container = document.getElementById('ai-locale-checkboxes');
        if (!container) return;

        const locales = Array.from(availableLocales.entries())
            .filter(([code]) => code !== 'en')
            .sort(([, a], [, b]) => (b.progress || 0) - (a.progress || 0));

        const html = locales.map(([code, locale]) => `
            <label class="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" value="${code}" class="locale-checkbox rounded text-blue-600">
                <span class="text-sm">${locale.name} (${locale.progress || 0}%)</span>
            </label>
        `).join('');

        container.innerHTML = html;
        
        // Add select all functionality
        const selectAllCheckbox = document.getElementById('ai-select-all-locales');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = container.querySelectorAll('.locale-checkbox');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
            });
        }
    }
    
    function renderLocaleGrid() {
        // Create a locale grid if it exists (for visual selection)
        const container = document.getElementById('ai-locale-grid');
        if (!container) return;

        const locales = Array.from(availableLocales.entries())
            .filter(([code]) => code !== 'en')
            .sort(([, a], [, b]) => (b.progress || 0) - (a.progress || 0));

        const html = locales.map(([code, locale]) => {
            const isActive = activeTranslations.has(code);
            const progressClass = getProgressClass(locale.progress || 0);
            
            return `
                <div class="locale-card bg-white rounded-lg shadow-md p-4 ${isActive ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'} transition-all">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="font-semibold text-lg">${locale.name}</h3>
                        <span class="text-sm text-gray-500">${code.toUpperCase()}</span>
                    </div>
                    
                    <div class="mb-3">
                        <div class="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span class="font-medium">${locale.progress || 0}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="h-2 rounded-full ${progressClass}" style="width: ${locale.progress || 0}%"></div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div>
                            <span class="block font-medium text-green-600">${locale.translated || 0}</span>
                            <span>Translated</span>
                        </div>
                        <div>
                            <span class="block font-medium text-red-600">${locale.missing || 0}</span>
                            <span>Missing</span>
                        </div>
                    </div>
                    
                    <div class="flex space-x-2">
                        ${isActive ? `
                            <button class="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                                    onclick="aiTranslator.stopTranslation('${code}')">
                                Stop
                            </button>
                        ` : `
                            <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                                    onclick="aiTranslator.quickTranslate('${code}')">
                                Translate
                            </button>
                        `}
                        <button class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                                onclick="aiTranslator.selectLocale('${code}')">
                            Select
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function renderLocaleSelect() {
        const select = document.getElementById('ai-locale-select');
        if (!select) return;

        const options = Array.from(availableLocales.entries())
            .filter(([code]) => code !== 'en')
            .map(([code, locale]) => 
                `<option value="${code}">${locale.name} (${locale.progress || 0}%)</option>`
            ).join('');

        select.innerHTML = `<option value="">Select a locale...</option>${options}`;
    }

    async function loadActiveTranslations() {
        try {
            const data = await apiClient.getActiveTranslations();
            activeTranslations.clear();
            
            (data.active || []).forEach(translation => {
                activeTranslations.set(translation.locale, translation);
            });
            
            renderActiveTranslations();
            renderLocaleGrid(); // Update grid with active status
            renderLocaleCheckboxes(); // Update checkboxes too
            
        } catch (error) {
            console.error('Error loading active translations:', error);
        }
    }

    function renderActiveTranslations() {
        const container = document.getElementById('active-translations-list');
        if (!container) return;

        if (activeTranslations.size === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No active translations</p>';
            return;
        }

        const html = Array.from(activeTranslations.entries()).map(([locale, translation]) => {
            const localeData = availableLocales.get(locale);
            const duration = translation.startTime ? 
                UIUtils.formatDuration(translation.startTime) : 'Unknown';
            
            return `
                <div class="active-translation-item bg-white rounded-lg border-l-4 border-blue-500 p-4 shadow-md">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-lg">${localeData?.name || locale}</h4>
                        <div class="flex space-x-2">
                            ${translation.isPaused ? `
                                <button class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                                        onclick="aiTranslator.resumeTranslation('${locale}')">
                                    Resume
                                </button>
                            ` : `
                                <button class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                                        onclick="aiTranslator.pauseTranslation('${locale}')">
                                    Pause
                                </button>
                            `}
                            <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                                    onclick="aiTranslator.stopTranslation('${locale}')">
                                Stop
                            </button>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">Mode:</span>
                            <span class="font-medium">${translation.mode}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Duration:</span>
                            <span class="font-medium">${duration}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Status:</span>
                            <span class="font-medium ${translation.isPaused ? 'text-yellow-600' : 'text-green-600'}">
                                ${translation.isPaused ? 'Paused' : 'Active'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function onLocaleSelectionChange() {
        updateEstimates();
    }

    function onModeChange() {
        updateEstimates();
    }

    async function updateEstimates() {
        const locale = document.getElementById('ai-locale-select')?.value;
        const mode = document.querySelector('input[name="translation-mode"]:checked')?.value;
        const priority = document.getElementById('priority-select')?.value;
        const batchSize = document.getElementById('batch-size')?.value || 10;
        
        if (!locale || !mode) return;
        
        const localeData = availableLocales.get(locale);
        if (!localeData) return;
        
        let estimatedKeys = 0;
        
        switch (mode) {
            case 'missing':
                estimatedKeys = localeData.missing || 0;
                break;
            case 'identical':
                estimatedKeys = localeData.identical || 0;
                break;
            case 'both':
                estimatedKeys = (localeData.missing || 0) + (localeData.identical || 0);
                break;
        }
        
        // Apply priority filter (rough estimate)
        if (priority === 'high') {
            estimatedKeys = Math.floor(estimatedKeys * 0.3);
        } else if (priority === 'medium') {
            estimatedKeys = Math.floor(estimatedKeys * 0.7);
        }
        
        const estimatedBatches = Math.ceil(estimatedKeys / parseInt(batchSize));
        const estimatedTime = estimatedKeys * 2; // 2 seconds per key estimate
        
        // Update UI
        UIUtils.setText('estimated-keys', estimatedKeys);
        UIUtils.setText('estimated-batches', estimatedBatches);
        UIUtils.setText('estimated-time', UIUtils.formatDuration(0, estimatedTime * 1000));
    }

    async function startTranslation() {
        // Get selected locales from checkboxes
        const checkboxes = document.querySelectorAll('#ai-locale-checkboxes .locale-checkbox:checked');
        const selectedLocales = Array.from(checkboxes).map(cb => cb.value);
        
        // Get other settings
        const mode = document.getElementById('ai-mode')?.value || 'missing';
        const priority = document.getElementById('ai-priority')?.value || 'all';
        const batchSize = parseInt(document.getElementById('ai-batch-size')?.value) || 25;
        
        if (selectedLocales.length === 0) {
            // Try to get from old select element as fallback
            const locale = document.getElementById('ai-locale-select')?.value;
            if (locale) {
                selectedLocales.push(locale);
            } else {
                UIUtils.showWarning('Please select at least one locale');
                return;
            }
        }
        
        try {
            for (const locale of selectedLocales) {
                if (activeTranslations.has(locale)) {
                    UIUtils.showWarning(`Translation already active for ${locale}`);
                    continue;
                }
                
                UIUtils.showInfo(`Starting ${mode} translation for ${availableLocales.get(locale)?.name || locale}...`);
                await apiClient.startBatchTranslation(locale, mode, priority, batchSize);
            }
            
            // Refresh active translations
            setTimeout(() => {
                loadActiveTranslations();
                loadLocales(); // Refresh progress
            }, 1000);
            
        } catch (error) {
            console.error('Error starting translation:', error);
            UIUtils.showError('Failed to start translation: ' + error.message);
        }
    }

    async function quickTranslate(locale) {
        try {
            UIUtils.showInfo(`Starting quick translation for ${availableLocales.get(locale)?.name || locale}...`);
            
            await apiClient.startBatchTranslation(locale, 'missing', 'all', 10);
            
            // Refresh UI
            setTimeout(() => {
                loadActiveTranslations();
                loadLocales();
            }, 1000);
            
        } catch (error) {
            console.error('Error starting quick translation:', error);
            UIUtils.showError('Failed to start translation');
        }
    }

    function selectLocale(locale) {
        const select = document.getElementById('ai-locale-select');
        if (select) {
            select.value = locale;
            updateEstimates();
        }
        
        UIUtils.showInfo(`Selected ${availableLocales.get(locale)?.name || locale}`);
    }

    async function stopTranslation(locale) {
        try {
            await apiClient.stopTranslation(locale);
            UIUtils.showSuccess(`Stopped translation for ${locale}`);
            
            // Refresh UI
            setTimeout(loadActiveTranslations, 1000);
            
        } catch (error) {
            console.error('Error stopping translation:', error);
            UIUtils.showError('Failed to stop translation');
        }
    }

    async function pauseTranslation(locale) {
        try {
            await apiClient.pauseTranslation(locale);
            UIUtils.showSuccess(`Paused translation for ${locale}`);
            
            setTimeout(loadActiveTranslations, 1000);
            
        } catch (error) {
            console.error('Error pausing translation:', error);
            UIUtils.showError('Failed to pause translation');
        }
    }

    async function resumeTranslation(locale) {
        try {
            await apiClient.resumeTranslation(locale);
            UIUtils.showSuccess(`Resumed translation for ${locale}`);
            
            setTimeout(loadActiveTranslations, 1000);
            
        } catch (error) {
            console.error('Error resuming translation:', error);
            UIUtils.showError('Failed to resume translation');
        }
    }

    async function stopAllTranslations() {
        if (activeTranslations.size === 0) {
            UIUtils.showWarning('No active translations to stop');
            return;
        }
        
        if (!confirm(`Stop all ${activeTranslations.size} active translations?`)) {
            return;
        }
        
        try {
            await apiClient.stopAllTranslations();
            UIUtils.showSuccess('Stopped all translations');
            
            setTimeout(loadActiveTranslations, 1000);
            
        } catch (error) {
            console.error('Error stopping all translations:', error);
            UIUtils.showError('Failed to stop all translations');
        }
    }

    function getProgressClass(progress) {
        if (progress >= 90) return 'bg-green-500';
        if (progress >= 70) return 'bg-yellow-500';
        if (progress >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    }

    // Export functions to global scope
    window.aiTranslator = {
        initialize: initializeAITranslateTab,
        quickTranslate,
        selectLocale,
        stopTranslation,
        pauseTranslation,
        resumeTranslation,
        startTranslation,
        stopAllTranslations,
        refresh: () => {
            loadLocales();
            loadActiveTranslations();
        }
    };

})();