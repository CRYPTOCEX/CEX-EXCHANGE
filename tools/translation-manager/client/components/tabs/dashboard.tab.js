// Dashboard Tab Functionality
(function() {
    let localesData = null;
    let localeStats = null;
    let logs = JSON.parse(localStorage.getItem('translation-logs') || '[]');
    
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    // Initialize when DOM is ready, but don't auto-load data
    document.addEventListener('DOMContentLoaded', function() {
        setupEventListeners();
    });

    let dashboardRefreshInterval = null;
    
    function initializeDashboardTab() {
        setupEventListeners();
        // Don't load data immediately - shared data should already be available
        // Just render using existing shared data
        if (window.sharedLocalesData) {
            localesData = window.sharedLocalesData;
            localeStats = { locales: localesData, totalKeys: Object.values(localesData)[0]?.totalKeys || 0 };
            logs = JSON.parse(localStorage.getItem('translation-logs') || '[]');
            
            // Render components without fetching
            renderOverviewStats();
            renderLocaleProgressGrid();
            renderRecentActivity();
        } else {
            // If shared data not available, load it
            loadDashboardData();
        }
        
        // Setup periodic refresh only if tab is active
        startDashboardRefresh();
    }
    
    window.startDashboardRefresh = function() {
        // Clear any existing interval
        if (dashboardRefreshInterval) {
            clearInterval(dashboardRefreshInterval);
        }
        
        // Only start if the dashboard tab is currently active
        if (isDashboardTabActive()) {
            dashboardRefreshInterval = setInterval(() => {
                if (isDashboardTabActive()) {
                    loadDashboardData();
                } else {
                    stopDashboardRefresh();
                }
            }, 30000);
        }
    }
    
    window.stopDashboardRefresh = function() {
        if (dashboardRefreshInterval) {
            clearInterval(dashboardRefreshInterval);
            dashboardRefreshInterval = null;
        }
    }
    
    function isDashboardTabActive() {
        const tab = document.getElementById('dashboard-tab');
        return tab && !tab.classList.contains('hidden');
    }

    function setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadDashboardData);
        }

        // Clear logs button
        const clearLogsBtn = document.getElementById('clear-activity-logs');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', clearActivityLogs);
        }

        // Quick actions
        const translateAllBtn = document.getElementById('translate-all-missing');
        if (translateAllBtn) {
            translateAllBtn.addEventListener('click', translateAllMissing);
        }

        const refreshStatsBtn = document.getElementById('refresh-stats');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', refreshStats);
        }
    }

    async function loadDashboardData() {
        try {
            // Use shared locale data if available, otherwise load it
            if (window.sharedLocalesData) {
                localesData = window.sharedLocalesData;
                localeStats = { locales: localesData, totalKeys: Object.values(localesData)[0]?.totalKeys || 0 };
            } else {
                // Fallback - load if not available (shouldn't happen normally)
                const data = await apiClient.getLocales();
                localesData = data.locales;
                localeStats = data;
            }
            
            // Load logs from localStorage
            logs = JSON.parse(localStorage.getItem('translation-logs') || '[]');
            
            // Render all dashboard components
            renderOverviewStats();
            renderLocaleProgressGrid();
            renderRecentActivity();
            // renderProgressChart(); // Container doesn't exist in HTML
            // renderQuickActions(); // Container doesn't exist in HTML
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            UIUtils.showError('Failed to load dashboard data');
        }
    }

    function renderOverviewStats() {
        if (!localesData) return;

        const locales = Object.values(localesData);
        const totalLocales = locales.length - 1; // Exclude English
        
        // Calculate totals
        const nonEnLocales = locales.filter((_, i) => Object.keys(localesData)[i] !== 'en');
        const totalTranslated = nonEnLocales.reduce((sum, locale) => sum + (locale.translated || 0), 0);
        const totalMissing = nonEnLocales.reduce((sum, locale) => sum + (locale.missing || 0), 0);
        
        // Update the existing HTML elements
        const localesEl = document.getElementById('dashboard-locales');
        const translatedEl = document.getElementById('dashboard-translated');
        const missingEl = document.getElementById('dashboard-missing');
        
        if (localesEl) localesEl.textContent = totalLocales;
        if (translatedEl) translatedEl.textContent = totalTranslated;
        if (missingEl) missingEl.textContent = totalMissing;
    }

    function renderLocaleProgressGrid() {
        const container = document.getElementById('locale-progress-grid');
        if (!container) return;

        if (!localesData) {
            container.innerHTML = '<p class="text-gray-500">Loading...</p>';
            return;
        }

        const locales = Object.entries(localesData)
            .filter(([code]) => code !== 'en')
            .sort(([, a], [, b]) => (b.progress || 0) - (a.progress || 0));

        const html = locales.map(([code, locale]) => {
            const progressClass = getProgressClass(locale.progress || 0);
            const statusIcon = getStatusIcon(locale.progress || 0);
            const progressColor = getProgressColor(locale.progress || 0);
            
            return `
                <div class="locale-progress-card bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold text-lg text-gray-900">${locale.name}</h3>
                        <span class="text-2xl">${statusIcon}</span>
                    </div>
                    
                    <div class="mb-4">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-600">Progress</span>
                            <span class="font-semibold ${progressColor}">${locale.progress || 0}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="h-2 rounded-full ${progressClass}" style="width: ${locale.progress || 0}%"></div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-3 text-center text-sm mb-4">
                        <div>
                            <div class="font-semibold text-green-600">${locale.translated || 0}</div>
                            <div class="text-gray-500">Done</div>
                        </div>
                        <div>
                            <div class="font-semibold text-red-600">${locale.missing || 0}</div>
                            <div class="text-gray-500">Missing</div>
                        </div>
                        <div>
                            <div class="font-semibold text-gray-600">${locale.totalKeys || 0}</div>
                            <div class="text-gray-500">Total</div>
                        </div>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition-colors"
                                onclick="dashboardTab.translateLocale('${code}')">
                            <i class="fas fa-robot mr-1"></i> Translate
                        </button>
                        <button class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors"
                                onclick="dashboardTab.viewLocale('${code}')">
                            <i class="fas fa-eye mr-1"></i> View
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function renderRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        const recentLogs = logs.slice(-10).reverse();
        
        if (recentLogs.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="font-semibold text-lg mb-4">Recent Activity</h3>
                    <p class="text-gray-500 text-center">No recent activity</p>
                </div>
            `;
            return;
        }

        const html = `
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-semibold text-lg">Recent Activity</h3>
                    <button class="text-sm text-blue-600 hover:text-blue-800" onclick="dashboardTab.clearActivityLogs()">
                        Clear All
                    </button>
                </div>
                <div class="space-y-3">
                    ${recentLogs.map(log => `
                        <div class="activity-item flex items-start space-x-3 p-3 rounded-lg ${getActivityBgClass(log.type)}">
                            <div class="flex-shrink-0">
                                <span class="text-lg">${getActivityIcon(log.type)}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-gray-900">${log.message}</p>
                                <p class="text-xs text-gray-500">${UIUtils.formatDate(log.timestamp)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function renderProgressChart() {
        const container = document.getElementById('dashboard-progress-chart');
        if (!container) return;

        if (!localesData) {
            container.innerHTML = '<p class="text-gray-500">Loading...</p>';
            return;
        }

        // Simple progress chart using CSS
        const locales = Object.entries(localesData)
            .filter(([code]) => code !== 'en')
            .sort(([, a], [, b]) => (b.progress || 0) - (a.progress || 0));

        const html = `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="font-semibold text-lg mb-6">Translation Progress Overview</h3>
                <div class="space-y-4">
                    ${locales.map(([code, locale]) => {
                        const progress = locale.progress || 0;
                        const progressColor = getProgressColor(progress);
                        
                        return `
                            <div class="progress-item">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-sm font-medium text-gray-700">${locale.name}</span>
                                    <span class="text-sm ${progressColor} font-semibold">${progress}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="h-2 rounded-full ${getProgressClass(progress)} transition-all duration-500" 
                                         style="width: ${progress}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function renderQuickActions() {
        const container = document.getElementById('dashboard-quick-actions');
        if (!container) return;

        const html = `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="font-semibold text-lg mb-4">Quick Actions</h3>
                <div class="grid grid-cols-2 gap-4">
                    <button class="quick-action-btn bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-left transition-colors"
                            onclick="router.navigateTo('ai-translate')">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-robot text-blue-600 text-lg mr-2"></i>
                            <span class="font-medium text-blue-900">AI Translation</span>
                        </div>
                        <p class="text-sm text-blue-700">Start batch translation</p>
                    </button>

                    <button class="quick-action-btn bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-left transition-colors"
                            onclick="router.navigateTo('translation')">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-edit text-green-600 text-lg mr-2"></i>
                            <span class="font-medium text-green-900">Manual Edit</span>
                        </div>
                        <p class="text-sm text-green-700">Edit translations manually</p>
                    </button>

                    <button class="quick-action-btn bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 text-left transition-colors"
                            onclick="router.navigateTo('untranslatable')">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-filter text-purple-600 text-lg mr-2"></i>
                            <span class="font-medium text-purple-900">Clean Up</span>
                        </div>
                        <p class="text-sm text-purple-700">Find untranslatable texts</p>
                    </button>

                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function getProgressClass(progress) {
        if (progress >= 90) return 'bg-green-500';
        if (progress >= 70) return 'bg-yellow-500';
        if (progress >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    }

    function getProgressColor(progress) {
        if (progress >= 90) return 'text-green-600';
        if (progress >= 70) return 'text-yellow-600';
        if (progress >= 40) return 'text-orange-600';
        return 'text-red-600';
    }

    function getStatusIcon(progress) {
        if (progress >= 95) return '✅';
        if (progress >= 70) return '🟡';
        return '🔴';
    }

    function getActivityIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️',
            process: '⚙️'
        };
        return icons[type] || icons.info;
    }

    function getActivityBgClass(type) {
        const classes = {
            success: 'bg-green-50 border-green-200',
            error: 'bg-red-50 border-red-200',
            info: 'bg-blue-50 border-blue-200',
            warning: 'bg-yellow-50 border-yellow-200',
            process: 'bg-gray-50 border-gray-200'
        };
        return classes[type] || classes.info;
    }

    async function translateLocale(localeCode) {
        try {
            const locale = localesData[localeCode];
            if (!locale) return;
            
            UIUtils.showInfo(`Starting translation for ${locale.name}...`);
            
            // Start quick translation (missing keys)
            await apiClient.startBatchTranslation(localeCode, 'missing', 'all', 10);
            
            // Navigate to AI translate tab to show progress
            router.navigateTo('ai-translate');
            
            // Add log entry
            addLog(`Started batch translation for ${locale.name}`, 'info');
            
        } catch (error) {
            console.error('Error starting translation:', error);
            UIUtils.showError(`Failed to start translation for ${localeCode}`);
        }
    }

    function viewLocale(localeCode) {
        // Navigate to translation editor with selected locale
        router.navigateTo('translation');
        
        // Set locale in translation editor if available
        setTimeout(() => {
            if (window.translationEditor) {
                translationEditor.setCurrentLocale(localeCode);
            }
        }, 100);
    }

    async function translateAllMissing() {
        if (!localesData) return;
        
        const locales = Object.entries(localesData)
            .filter(([code, locale]) => code !== 'en' && (locale.missing || 0) > 0);
        
        if (locales.length === 0) {
            UIUtils.showInfo('No missing translations found');
            return;
        }
        
        if (!confirm(`Start translation for ${locales.length} locales with missing translations?`)) {
            return;
        }
        
        try {
            UIUtils.showInfo(`Starting translation for ${locales.length} locales...`);
            
            // Start translations for all locales with missing keys
            for (const [code] of locales) {
                await apiClient.startBatchTranslation(code, 'missing', 'all', 10);
                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            router.navigateTo('ai-translate');
            addLog(`Started batch translations for ${locales.length} locales`, 'info');
            
        } catch (error) {
            console.error('Error starting batch translations:', error);
            UIUtils.showError('Failed to start batch translations');
        }
    }

    function refreshStats() {
        loadDashboardData();
        UIUtils.showSuccess('Dashboard refreshed');
    }

    function clearActivityLogs() {
        if (!confirm('Clear all activity logs?')) {
            return;
        }
        
        logs = [];
        localStorage.removeItem('translation-logs');
        renderRecentActivity();
        UIUtils.showSuccess('Activity logs cleared');
    }

    function addLog(message, type = 'info') {
        const log = {
            message,
            type,
            timestamp: Date.now()
        };
        
        logs.push(log);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs = logs.slice(-100);
        }
        
        localStorage.setItem('translation-logs', JSON.stringify(logs));
        
        // Update recent activity display
        renderRecentActivity();
    }

    // Export functions to global scope
    window.dashboardTab = {
        translateLocale,
        viewLocale,
        translateAllMissing,
        refreshStats,
        clearActivityLogs,
        addLog,
        refresh: loadDashboardData,
        initialize: initializeDashboardTab
    };

})();