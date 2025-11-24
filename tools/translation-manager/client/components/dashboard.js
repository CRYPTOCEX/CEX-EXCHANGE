class Dashboard {
    constructor() {
        this.locales = new Map();
        this.localeStats = null;
        this.logs = JSON.parse(localStorage.getItem('translation-logs') || '[]');
    }

    async render() {
        await this.loadData();
        this.renderProgressGrid();
        this.renderRecentActivity();
        this.renderStats();
    }

    async loadData() {
        try {
            // Use shared locale data if available
            let data;
            if (window.sharedLocalesData) {
                data = { locales: window.sharedLocalesData };
            } else {
                // Fallback - load if not available (shouldn't happen normally)
                data = await apiClient.getLocales();
            }
            this.localeStats = data;
            
            // Convert to Map for easier access
            Object.entries(data.locales).forEach(([code, locale]) => {
                this.locales.set(code, locale);
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            UIUtils.showError('Failed to load dashboard data');
        }
    }

    renderProgressGrid() {
        const container = document.getElementById('locale-progress-grid');
        if (!container) return;

        const locales = Array.from(this.locales.entries())
            .filter(([code]) => code !== 'en')
            .sort(([, a], [, b]) => b.progress - a.progress);

        const html = locales.map(([code, locale]) => {
            const progressClass = this.getProgressClass(locale.progress);
            const statusIcon = this.getStatusIcon(locale.progress);
            
            return `
                <div class="locale-card" data-locale="${code}">
                    <div class="locale-header">
                        <h3>${locale.name}</h3>
                        <span class="status-icon">${statusIcon}</span>
                    </div>
                    <div class="progress-info">
                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass}" 
                                 style="width: ${locale.progress}%"></div>
                        </div>
                        <span class="progress-text">${locale.progress}%</span>
                    </div>
                    <div class="locale-stats">
                        <div class="stat">
                            <span class="stat-label">Translated</span>
                            <span class="stat-value">${locale.translated || 0}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Missing</span>
                            <span class="stat-value">${locale.missing || 0}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Total</span>
                            <span class="stat-value">${locale.totalKeys || 0}</span>
                        </div>
                    </div>
                    <div class="locale-actions">
                        <button class="btn btn-sm btn-primary" 
                                onclick="dashboard.translateLocale('${code}')">
                            Translate Missing
                        </button>
                        <button class="btn btn-sm btn-secondary" 
                                onclick="router.navigateTo('translation'); translationEditor.setLocale('${code}')">
                            Edit
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        const recentLogs = this.logs.slice(-10).reverse();
        
        if (recentLogs.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent activity</p>';
            return;
        }

        const html = recentLogs.map(log => `
            <div class="activity-item">
                <div class="activity-icon ${log.type}">${this.getActivityIcon(log.type)}</div>
                <div class="activity-content">
                    <div class="activity-message">${log.message}</div>
                    <div class="activity-time">${UIUtils.formatDate(log.timestamp)}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderStats() {
        const container = document.getElementById('dashboard-stats');
        if (!container) return;

        const totalLocales = this.locales.size - 1; // Exclude English
        const totalKeys = this.localeStats?.totalKeys || 0;
        const averageProgress = this.calculateAverageProgress();
        const completedLocales = this.getCompletedLocales();

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${totalLocales}</div>
                <div class="stat-label">Languages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalKeys}</div>
                <div class="stat-label">Total Keys</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.round(averageProgress)}%</div>
                <div class="stat-label">Avg Progress</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${completedLocales}</div>
                <div class="stat-label">Completed</div>
            </div>
        `;
    }

    getProgressClass(progress) {
        if (progress >= 90) return 'progress-complete';
        if (progress >= 70) return 'progress-high';
        if (progress >= 40) return 'progress-medium';
        return 'progress-low';
    }

    getStatusIcon(progress) {
        if (progress >= 95) return '✅';
        if (progress >= 70) return '🟡';
        return '🔴';
    }

    getActivityIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️',
            process: '⚙️'
        };
        return icons[type] || icons.info;
    }

    calculateAverageProgress() {
        const locales = Array.from(this.locales.values()).filter((_, i) => i > 0); // Skip English
        if (locales.length === 0) return 0;
        
        const total = locales.reduce((sum, locale) => sum + (locale.progress || 0), 0);
        return total / locales.length;
    }

    getCompletedLocales() {
        return Array.from(this.locales.values())
            .filter(locale => locale.progress >= 95).length;
    }

    async translateLocale(localeCode) {
        try {
            UIUtils.showInfo(`Starting translation for ${this.locales.get(localeCode)?.name || localeCode}`);
            
            await apiClient.startBatchTranslation(localeCode, 'missing', 'all', 10);
            
            // Refresh dashboard after a short delay
            setTimeout(() => {
                this.render();
            }, 1000);
            
        } catch (error) {
            console.error('Error starting translation:', error);
            UIUtils.showError(`Failed to start translation for ${localeCode}`);
        }
    }

    addLog(message, type = 'info') {
        const log = {
            message,
            type,
            timestamp: Date.now()
        };
        
        this.logs.push(log);
        
        // Keep only last 100 logs
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(-100);
        }
        
        localStorage.setItem('translation-logs', JSON.stringify(this.logs));
        
        // Update recent activity if visible
        this.renderRecentActivity();
    }

    clearLogs() {
        this.logs = [];
        localStorage.removeItem('translation-logs');
        this.renderRecentActivity();
        UIUtils.showSuccess('Activity log cleared');
    }
}

// Create singleton instance
window.dashboard = new Dashboard();