// Simplified tab initialization to prevent multiple API calls
(function() {
    // Simple initialization functions for each tab
    window.simpleTabs = {
        
        initializeDashboard() {
            if (!initializationGuard.canInitialize('dashboard')) return;
            
            if (window.dashboardTab && window.dashboardTab.initialize) {
                dashboardTab.initialize();
            }
            
            // Start the refresh interval for dashboard
            if (window.startDashboardRefresh) {
                startDashboardRefresh();
            }
        },
        
        initializeTranslationEditor() {
            if (!initializationGuard.canInitialize('translation-editor')) return;
            
            if (window.translationEditor && window.translationEditor.initialize) {
                translationEditor.initialize();
            }
        },
        
        initializeAITranslate() {
            if (!initializationGuard.canInitialize('ai-translate')) return;
            
            if (window.aiTranslator && window.aiTranslator.initialize) {
                aiTranslator.initialize();
            }
            
            // Start the refresh interval for this tab
            if (window.startActiveTranslationsRefresh) {
                startActiveTranslationsRefresh();
            }
        },
        
        initializeUntranslatable() {
            if (!initializationGuard.canInitialize('untranslatable')) return;
            
            if (window.untranslatableManager && window.untranslatableManager.initialize) {
                untranslatableManager.initialize();
            }
        },
        
        initializeComparison() {
            if (!initializationGuard.canInitialize('comparison')) return;
            
            if (window.comparisonTool && window.comparisonTool.initialize) {
                comparisonTool.initialize();
            }
        },
        
        // Initialize orphaned tab
        initializeOrphaned() {
            if (!initializationGuard.canInitialize('orphaned')) return;
            
            if (window.orphanedTab && window.orphanedTab.initialize) {
                orphanedTab.initialize();
            }
        },
        
        // Initialize JSX cleanup tab  
        initializeJSXCleanup() {
            if (!initializationGuard.canInitialize('jsx-cleanup')) return;
            
            if (window.jsxCleanupTab && window.jsxCleanupTab.initialize) {
                jsxCleanupTab.initialize();
            }
        },
        
        // Generic initializer for tabs that don't need API calls
        initializeSimpleTab(tabName) {
            // Handle specific tabs that have their own initialization
            if (tabName === 'orphaned') {
                return this.initializeOrphaned();
            }
            if (tabName === 'jsx-cleanup') {
                return this.initializeJSXCleanup();
            }
            
            const tab = document.getElementById(`${tabName}-tab`);
            if (tab && !tab.dataset.loaded) {
                tab.dataset.loaded = 'true';
                return true;
            }
            return false;
        }
    };
})();