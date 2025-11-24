// Translation Editor Tab Functionality with Virtual Scrolling
(function() {
    let currentLocale = null;
    let currentKey = null;
    let translationKeys = [];
    let filteredKeys = [];
    let virtualScroller = null;
    const ITEMS_PER_PAGE = 50;
    const ITEM_HEIGHT = 120; // Height of each translation item in pixels
    
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    // Initialize when DOM is ready (setup event listeners only - don't load data)
    document.addEventListener('DOMContentLoaded', function() {
        // Don't auto-initialize, wait for router to call it
        // initializeTranslationEditor();
    });

    function initializeTranslationEditor() {
        // Setup event listeners
        setupEventListeners();
        
        // Use shared data if available instead of loading
        if (window.sharedLocalesData) {
            renderLocaleOptions(window.sharedLocalesData);
            
            // Load first non-English locale by default
            const locales = Object.keys(window.sharedLocalesData);
            const firstLocale = locales.find(code => code !== 'en') || locales[0];
            if (firstLocale) {
                setCurrentLocale(firstLocale);
            }
        } else {
            // Load initial data only if shared data not available
            loadLocales();
        }
    }

    function setupEventListeners() {
        // Locale selection
        const localeSelect = document.getElementById('locale-select');
        if (localeSelect) {
            localeSelect.addEventListener('change', onLocaleChange);
        }

        // Search functionality
        const searchInput = document.getElementById('key-search');
        if (searchInput) {
            searchInput.addEventListener('input', UIUtils.debounce(onSearchKeys, 300));
        }

        // Filter buttons
        const filterBtns = document.querySelectorAll('[data-filter]');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', onFilterChange);
        });

        // Save button
        const saveBtn = document.getElementById('save-translation');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveCurrentTranslation);
        }

        // AI Translate button
        const aiBtn = document.getElementById('ai-translate-key');
        if (aiBtn) {
            aiBtn.addEventListener('click', aiTranslateCurrentKey);
        }

        // Auto-save checkbox
        const autoSaveCheck = document.getElementById('auto-save-translations');
        if (autoSaveCheck) {
            autoSaveCheck.addEventListener('change', onAutoSaveToggle);
            // Load saved preference
            const saved = localStorage.getItem('auto-save-translations');
            if (saved !== null) {
                autoSaveCheck.checked = JSON.parse(saved);
            }
        }
    }

    async function loadLocales() {
        try {
            // Use shared locale data if available
            let localesData;
            if (window.sharedLocalesData) {
                localesData = window.sharedLocalesData;
            } else {
                // Fallback - load if not available
                const data = await apiClient.getLocales();
                localesData = data.locales;
            }
            renderLocaleOptions(localesData);
            
            // Load first non-English locale by default
            const locales = Object.keys(localesData);
            const firstLocale = locales.find(code => code !== 'en') || locales[0];
            if (firstLocale) {
                setCurrentLocale(firstLocale);
            }
        } catch (error) {
            console.error('Error loading locales:', error);
            UIUtils.showError('Failed to load locales');
        }
    }

    function renderLocaleOptions(locales) {
        const select = document.getElementById('locale-select');
        if (!select) return;

        const options = Object.entries(locales)
            .filter(([code]) => code !== 'en') // Exclude English
            .map(([code, locale]) => 
                `<option value="${code}">${locale.name} (${locale.progress || 0}%)</option>`
            ).join('');

        select.innerHTML = `<option value="">Select a locale...</option>${options}`;
    }

    async function onLocaleChange(event) {
        const localeCode = event.target.value;
        if (localeCode) {
            await setCurrentLocale(localeCode);
        }
    }

    async function setCurrentLocale(localeCode) {
        currentLocale = localeCode;
        
        try {
            const data = await apiClient.getLocaleKeys(localeCode);
            translationKeys = data.keys || [];
            filteredKeys = [...translationKeys];
            
            renderKeysList();
            updateStats();
            
            // Update locale select
            const select = document.getElementById('locale-select');
            if (select) {
                select.value = localeCode;
            }
            
        } catch (error) {
            console.error('Error loading translation keys:', error);
            UIUtils.showError('Failed to load translation keys');
        }
    }

    function renderKeysList() {
        const container = document.getElementById('translation-keys-list');
        if (!container) return;

        if (filteredKeys.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No keys found</p>';
            return;
        }

        // Initialize virtual scroller
        if (!virtualScroller) {
            initializeVirtualScroller(container);
        } else {
            // Update virtual scroller with new data
            updateVirtualScroller();
        }
    }

    function initializeVirtualScroller(container) {
        // Create virtual scroll structure
        container.innerHTML = `
            <div class="virtual-scroll-container" style="position: relative; width: 100%; overflow-y: auto; max-height: 600px;">
                <div class="virtual-scroll-spacer" style="height: ${filteredKeys.length * ITEM_HEIGHT}px; position: relative;">
                    <div class="virtual-scroll-content" style="position: absolute; top: 0; left: 0; right: 0;"></div>
                </div>
            </div>
        `;

        const scrollContainer = container.querySelector('.virtual-scroll-container');
        const contentContainer = container.querySelector('.virtual-scroll-content');
        
        virtualScroller = {
            container: scrollContainer,
            content: contentContainer,
            lastScrollTop: 0,
            visibleStart: 0,
            visibleEnd: ITEMS_PER_PAGE
        };

        // Add scroll listener
        scrollContainer.addEventListener('scroll', handleVirtualScroll);
        
        // Initial render
        renderVisibleItems();
    }

    function handleVirtualScroll(event) {
        if (!virtualScroller) return;
        
        const scrollTop = event.target.scrollTop;
        const containerHeight = event.target.clientHeight;
        
        // Calculate visible range
        const start = Math.floor(scrollTop / ITEM_HEIGHT);
        const end = Math.min(
            start + Math.ceil(containerHeight / ITEM_HEIGHT) + 1,
            filteredKeys.length
        );
        
        // Only re-render if visible range changed
        if (start !== virtualScroller.visibleStart || end !== virtualScroller.visibleEnd) {
            virtualScroller.visibleStart = start;
            virtualScroller.visibleEnd = end;
            renderVisibleItems();
        }
    }

    function renderVisibleItems() {
        if (!virtualScroller) return;
        
        const { visibleStart, visibleEnd, content } = virtualScroller;
        const visibleKeys = filteredKeys.slice(visibleStart, visibleEnd);
        
        const html = visibleKeys.map((key, index) => {
            const actualIndex = visibleStart + index;
            const statusClass = key.needsTranslation ? 'border-l-4 border-red-500' : 
                               key.isIdentical ? 'border-l-4 border-yellow-500' : 
                               'border-l-4 border-green-500';
            
            const statusIcon = key.needsTranslation ? '❌' : 
                              key.isIdentical ? '⚠️' : '✅';

            return `
                <div class="key-item bg-white rounded-lg shadow-sm border ${statusClass} mb-3 p-4 hover:shadow-lg transition-all cursor-pointer"
                     style="position: absolute; top: ${actualIndex * ITEM_HEIGHT}px; left: 0; right: 0; height: ${ITEM_HEIGHT - 12}px;"
                     onclick="translationEditor.selectKey('${key.path.replace(/'/g, "\\'")}')">
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">${statusIcon}</span>
                                <h3 class="font-semibold text-gray-900 text-sm truncate" title="${key.path}">
                                    ${key.path}
                                </h3>
                            </div>
                        </div>
                        <button class="ml-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                                onclick="event.stopPropagation(); translationEditor.quickTranslate('${key.path.replace(/'/g, "\\'")}')">
                            <i class="fas fa-robot"></i> AI
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div class="bg-gray-50 rounded p-2">
                            <div class="text-xs text-gray-500 mb-1">English</div>
                            <div class="text-gray-800 line-clamp-2" title="${(key.englishValue || 'N/A').replace(/"/g, '&quot;')}">
                                ${key.englishValue || '<span class="text-gray-400 italic">N/A</span>'}
                            </div>
                        </div>
                        <div class="bg-blue-50 rounded p-2">
                            <div class="text-xs text-gray-500 mb-1">Translation</div>
                            <div class="text-gray-800 line-clamp-2" title="${(key.value || '').replace(/"/g, '&quot;')}">
                                ${key.value || '<span class="text-gray-400 italic">Not translated</span>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = html;
    }

    function updateVirtualScroller() {
        if (!virtualScroller) return;
        
        // Update spacer height
        const spacer = virtualScroller.container.querySelector('.virtual-scroll-spacer');
        if (spacer) {
            spacer.style.height = `${filteredKeys.length * ITEM_HEIGHT}px`;
        }
        
        // Reset scroll position and re-render
        virtualScroller.visibleStart = 0;
        virtualScroller.visibleEnd = Math.min(ITEMS_PER_PAGE, filteredKeys.length);
        virtualScroller.container.scrollTop = 0;
        renderVisibleItems();
    }

    function onSearchKeys(event) {
        const query = event.target.value.toLowerCase();
        
        if (!query) {
            filteredKeys = [...translationKeys];
        } else {
            filteredKeys = translationKeys.filter(key =>
                key.path.toLowerCase().includes(query) ||
                (key.englishValue && key.englishValue.toLowerCase().includes(query)) ||
                (key.value && key.value.toLowerCase().includes(query))
            );
        }
        
        renderKeysList();
        updateStats();
    }

    function onFilterChange(event) {
        const filter = event.target.getAttribute('data-filter');
        
        // Update active filter button
        document.querySelectorAll('[data-filter]').forEach(btn => 
            btn.classList.remove('bg-blue-500', 'text-white'));
        event.target.classList.add('bg-blue-500', 'text-white');
        
        // Apply filter
        switch (filter) {
            case 'all':
                filteredKeys = [...translationKeys];
                break;
            case 'missing':
                filteredKeys = translationKeys.filter(key => key.needsTranslation);
                break;
            case 'identical':
                filteredKeys = translationKeys.filter(key => key.isIdentical);
                break;
            case 'translated':
                filteredKeys = translationKeys.filter(key => !key.needsTranslation && !key.isIdentical);
                break;
        }
        
        renderKeysList();
        updateStats();
    }

    function updateStats() {
        const total = translationKeys.length;
        const missing = translationKeys.filter(key => key.needsTranslation).length;
        const identical = translationKeys.filter(key => key.isIdentical).length;
        const translated = total - missing - identical;
        
        UIUtils.setText('translation-stats-total', total);
        UIUtils.setText('translation-stats-missing', missing);
        UIUtils.setText('translation-stats-identical', identical);
        UIUtils.setText('translation-stats-translated', translated);
        
        const progress = total > 0 ? Math.round((translated / total) * 100) : 0;
        UIUtils.setText('translation-progress-percent', `${progress}%`);
        
        const progressBar = document.getElementById('translation-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    async function selectKey(keyPath) {
        currentKey = keyPath;
        const key = translationKeys.find(k => k.path === keyPath);
        
        if (!key) return;
        
        // Update editor UI
        UIUtils.setText('current-key-path', keyPath);
        UIUtils.setText('current-key-english', key.englishValue || '');
        
        const translationInput = document.getElementById('current-key-translation');
        if (translationInput) {
            translationInput.value = key.value || '';
            translationInput.focus();
        }
        
        // Show editor panel
        UIUtils.show('translation-editor-panel');
        
        // Highlight selected key
        document.querySelectorAll('.key-item').forEach(item => 
            item.classList.remove('ring-2', 'ring-blue-500'));
        
        const selectedItem = document.querySelector(`[onclick*="${keyPath}"]`);
        if (selectedItem) {
            selectedItem.classList.add('ring-2', 'ring-blue-500');
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    async function saveCurrentTranslation() {
        if (!currentLocale || !currentKey) {
            UIUtils.showWarning('Please select a key to translate');
            return;
        }
        
        const translationInput = document.getElementById('current-key-translation');
        if (!translationInput) return;
        
        const translation = translationInput.value.trim();
        
        try {
            await apiClient.updateLocaleKey(currentLocale, currentKey, translation);
            
            // Update local data
            const keyIndex = translationKeys.findIndex(k => k.path === currentKey);
            if (keyIndex >= 0) {
                translationKeys[keyIndex].value = translation;
                translationKeys[keyIndex].needsTranslation = !translation;
                translationKeys[keyIndex].isIdentical = translation === translationKeys[keyIndex].englishValue;
            }
            
            // Refresh UI
            renderKeysList();
            updateStats();
            
            UIUtils.showSuccess('Translation saved successfully');
            
        } catch (error) {
            console.error('Error saving translation:', error);
            UIUtils.showError('Failed to save translation');
        }
    }

    async function aiTranslateCurrentKey() {
        if (!currentLocale || !currentKey) {
            UIUtils.showWarning('Please select a key to translate');
            return;
        }
        
        const key = translationKeys.find(k => k.path === currentKey);
        if (!key || !key.englishValue) {
            UIUtils.showWarning('No English text to translate');
            return;
        }
        
        try {
            UIUtils.showInfo('Translating with AI...');
            
            const result = await apiClient.translateKey(
                key.englishValue, 
                currentLocale, 
                `Translation key: ${currentKey}`
            );
            
            const translationInput = document.getElementById('current-key-translation');
            if (translationInput && result.translation) {
                translationInput.value = result.translation;
                UIUtils.showSuccess('AI translation completed');
                
                // Auto-save if enabled
                const autoSave = document.getElementById('auto-save-translations');
                if (autoSave && autoSave.checked) {
                    await saveCurrentTranslation();
                }
            }
            
        } catch (error) {
            console.error('Error with AI translation:', error);
            UIUtils.showError('AI translation failed');
        }
    }

    async function quickTranslate(keyPath) {
        if (!currentLocale) {
            UIUtils.showWarning('Please select a locale first');
            return;
        }
        
        const key = translationKeys.find(k => k.path === keyPath);
        if (!key || !key.englishValue) {
            UIUtils.showWarning('No English text to translate');
            return;
        }
        
        try {
            UIUtils.showInfo(`Translating ${keyPath}...`);
            
            const result = await apiClient.translateKey(
                key.englishValue, 
                currentLocale, 
                `Translation key: ${keyPath}`
            );
            
            if (result.translation) {
                await apiClient.updateLocaleKey(currentLocale, keyPath, result.translation);
                
                // Update local data
                const keyIndex = translationKeys.findIndex(k => k.path === keyPath);
                if (keyIndex >= 0) {
                    translationKeys[keyIndex].value = result.translation;
                    translationKeys[keyIndex].needsTranslation = false;
                    translationKeys[keyIndex].isIdentical = result.translation === translationKeys[keyIndex].englishValue;
                    
                    // Update filtered keys too
                    const filteredIndex = filteredKeys.findIndex(k => k.path === keyPath);
                    if (filteredIndex >= 0) {
                        filteredKeys[filteredIndex] = translationKeys[keyIndex];
                    }
                }
                
                // Re-render visible items
                renderVisibleItems();
                updateStats();
                
                UIUtils.showSuccess(`Translated: ${keyPath}`);
            }
            
        } catch (error) {
            console.error('Error with quick translation:', error);
            UIUtils.showError('Quick translation failed');
        }
    }

    function onAutoSaveToggle(event) {
        const enabled = event.target.checked;
        localStorage.setItem('auto-save-translations', JSON.stringify(enabled));
        
        if (enabled) {
            UIUtils.showInfo('Auto-save enabled');
        } else {
            UIUtils.showInfo('Auto-save disabled');
        }
    }

    // Cleanup function for virtual scroller
    function cleanupVirtualScroller() {
        if (virtualScroller && virtualScroller.container) {
            virtualScroller.container.removeEventListener('scroll', handleVirtualScroll);
        }
        virtualScroller = null;
    }

    // Export functions to global scope
    window.translationEditor = {
        initialize: initializeTranslationEditor,
        setCurrentLocale,
        selectKey,
        saveCurrentTranslation,
        aiTranslateCurrentKey,
        quickTranslate,
        getCurrentLocale: () => currentLocale,
        getCurrentKey: () => currentKey,
        getTranslationKeys: () => translationKeys,
        refresh: () => {
            if (currentLocale) {
                setCurrentLocale(currentLocale);
            } else {
                loadLocales();
            }
        },
        cleanup: cleanupVirtualScroller
    };

})();