class TranslationManager {
    constructor() {
        this.locales = new Map();
        this.localeConfig = null;
        this.currentLocale = null;
        this.currentKey = null;
        
        this.init();
    }

    async init() {
        console.log('Initializing Translation Manager...');
        
        try {
            // Initialize services
            await this.initializeServices();
            
            // Setup routing
            this.setupRoutes();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            console.log('Translation Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Translation Manager:', error);
            UIUtils.showError('Failed to initialize application');
        }
    }

    async initializeServices() {
        // Connect WebSocket
        wsClient.connect();
        
        // Setup WebSocket event handlers
        wsClient.on('connected', () => {
            UIUtils.showSuccess('Connected to translation server');
        });
        
        wsClient.on('error', () => {
            UIUtils.showError('WebSocket connection error');
        });
        
        wsClient.on('disconnected', () => {
            UIUtils.showWarning('Disconnected from server, attempting to reconnect...');
        });
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                try {
                    await this.loadInitialData();
                    UIUtils.showSuccess('Data refreshed successfully');
                } catch (error) {
                    console.error('Error refreshing data:', error);
                    UIUtils.showError('Failed to refresh data');
                }
            });
        }
    }

    setupRoutes() {
        // Register all route handlers
        router.register('dashboard', () => {
            this.showTab('dashboard');
            this.loadDashboardTab();
        });
        
        router.register('locales', () => {
            this.showTab('locales');
            this.loadLocalesTab();
        });
        
        router.register('translations', () => {
            this.showTab('translations');
            this.loadTranslationEditor();
        });
        
        router.register('ai-translate', () => {
            this.showTab('ai-translate');
            this.loadAITranslateTab();
        });
        
        // Progress page removed
        
        router.register('tools', () => {
            this.showTab('tools');
            this.loadToolsTab();
        });
        
        router.register('untranslatable', () => {
            this.showTab('untranslatable');
            this.loadUntranslatableTab();
        });
        
        router.register('comparison', () => {
            this.showTab('comparison');
            this.loadComparisonTab();
        });
        
        router.register('orphaned', () => {
            this.showTab('orphaned');
            this.loadOrphanedTab();
        });
        
        router.register('jsx-cleanup', () => {
            this.showTab('jsx-cleanup');
            this.loadJSXCleanupTab();
        });
        
        // Logs page removed
        
        router.register('settings', () => {
            this.showTab('settings');
            this.loadSettingsTab();
        });
    }

    async loadInitialData() {
        try {
            // Load locale configuration
            const configData = await apiClient.getLocaleConfig();
            this.localeConfig = configData.locales;
            
            // Load locales data - ONLY ONCE HERE
            const data = await apiClient.getLocales();
            
            // Store raw data for tabs to use
            this.localesData = data.locales;
            
            // Convert to Map for easier access
            Object.entries(data.locales).forEach(([code, locale]) => {
                this.locales.set(code, locale);
            });
            
            // Make locale data globally available for tabs
            window.sharedLocalesData = data.locales;
            
            // Update header stats
            this.updateHeaderStats();
            
            console.log('Initial data loaded successfully');
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            UIUtils.showError('Failed to load application data');
        }
    }

    showTab(tabName) {
        // Stop all refresh intervals when switching tabs
        this.stopAllRefreshIntervals();
        
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
            tab.classList.remove('active');
        });
        
        // Show selected tab
        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.remove('hidden');
            activeTab.classList.add('active');
        } else {
            console.warn(`Tab element not found: ${tabName}-tab`);
        }
        
        // Update navigation - look for both data-route and data-tab attributes
        document.querySelectorAll('.sidebar-item').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeNavTab = document.querySelector(`[data-tab="${tabName}"]`) || 
                            document.querySelector(`[data-route="${tabName}"]`);
        if (activeNavTab) {
            activeNavTab.classList.add('active');
        }
    }
    
    stopAllRefreshIntervals() {
        // Stop all tab refresh intervals
        if (window.stopActiveTranslationsRefresh) {
            stopActiveTranslationsRefresh();
        }
        if (window.stopDashboardRefresh) {
            stopDashboardRefresh();
        }
    }

    async loadTranslationEditor() {
        if (window.simpleTabs) {
            simpleTabs.initializeTranslationEditor();
        }
    }

    async loadAITranslateTab() {
        if (window.simpleTabs) {
            simpleTabs.initializeAITranslate();
        }
    }

    async loadUntranslatableTab() {
        if (window.simpleTabs) {
            simpleTabs.initializeUntranslatable();
        }
    }

    async loadToolsTab() {
        if (window.toolsTab) {
            toolsTab.initialize();
        }
    }

    async loadComparisonTab() {
        if (window.simpleTabs) {
            simpleTabs.initializeComparison();
        }
    }

    async loadOrphanedTab() {
        if (window.simpleTabs) {
            simpleTabs.initializeSimpleTab('orphaned');
        }
    }

    async loadJSXCleanupTab() {
        if (window.simpleTabs) {
            simpleTabs.initializeSimpleTab('jsx-cleanup');
        }
    }

    async loadDashboardTab() {
        if (window.simpleTabs) {
            simpleTabs.initializeDashboard();
        }
    }

    async loadLocalesTab() {
        if (window.localesTab) {
            localesTab.initialize();
        }
    }

    updateHeaderStats() {
        // Update total locales count
        const totalLocalesElement = document.getElementById('total-locales');
        if (totalLocalesElement) {
            totalLocalesElement.textContent = this.locales.size;
        }
        
        // Update total keys count (from English locale)
        const totalKeysElement = document.getElementById('total-keys');
        if (totalKeysElement) {
            const enLocale = this.locales.get('en');
            if (enLocale && enLocale.keys) {
                totalKeysElement.textContent = Object.keys(enLocale.keys).length;
            } else if (enLocale && enLocale.total) {
                totalKeysElement.textContent = enLocale.total;
            } else {
                totalKeysElement.textContent = '0';
            }
        }
    }

    async loadSettingsTab() {
        this.renderSettings();
    }


    renderSettings() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Application Settings</h3>
                
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="auto-save" checked>
                        Auto-save translations
                    </label>
                </div>
                
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="live-feed-enabled" checked>
                        Enable live translation feed
                    </label>
                </div>
                
                <div class="setting-group">
                    <label>Default batch size for translations:</label>
                    <select id="default-batch-size">
                        <option value="5">5</option>
                        <option value="10" selected>10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <button class="btn btn-primary" onclick="this.saveSettings()">
                        Save Settings
                    </button>
                    <button class="btn btn-secondary" onclick="this.resetSettings()">
                        Reset to Defaults
                    </button>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>Data Management</h3>
                
                <div class="setting-group">
                    <button class="btn btn-warning" onclick="this.clearAllData()">
                        Clear All Local Data
                    </button>
                    <small class="text-muted">This will clear settings and cached data</small>
                </div>
                
                <div class="setting-group">
                    <button class="btn btn-info" onclick="this.exportData()">
                        Export Data
                    </button>
                    <button class="btn btn-info" onclick="this.importData()">
                        Import Data
                    </button>
                </div>
            </div>
        `;
    }


    saveSettings() {
        const settings = {
            autoSave: document.getElementById('auto-save').checked,
            liveFeedEnabled: document.getElementById('live-feed-enabled').checked,
            defaultBatchSize: document.getElementById('default-batch-size').value
        };
        
        localStorage.setItem('translation-settings', JSON.stringify(settings));
        UIUtils.showSuccess('Settings saved successfully');
    }

    resetSettings() {
        localStorage.removeItem('translation-settings');
        this.renderSettings();
        UIUtils.showSuccess('Settings reset to defaults');
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
            localStorage.clear();
            UIUtils.showSuccess('All local data cleared');
            // Reload the page to reset the application state
            window.location.reload();
        }
    }

    exportData() {
        const data = {
            settings: JSON.parse(localStorage.getItem('translation-settings') || '{}'),
            timestamp: Date.now()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation-manager-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        UIUtils.showSuccess('Data exported successfully');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.settings) {
                        localStorage.setItem('translation-settings', JSON.stringify(data.settings));
                    }
                    
                    UIUtils.showSuccess('Data imported successfully');
                    this.renderSettings();
                } catch (error) {
                    UIUtils.showError('Failed to import data: Invalid file format');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    // Utility methods for accessing application data
    getLocale(code) {
        return this.locales.get(code);
    }

    getAllLocales() {
        return Array.from(this.locales.entries());
    }

    getCurrentLocale() {
        return this.currentLocale;
    }

    setCurrentLocale(locale) {
        this.currentLocale = locale;
    }

    getCurrentKey() {
        return this.currentKey;
    }

    setCurrentKey(key) {
        this.currentKey = key;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.translationManager = new TranslationManager();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.UIUtils) {
        UIUtils.showError('An unexpected error occurred');
    }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.UIUtils) {
        UIUtils.showError('An unexpected error occurred');
    }
});