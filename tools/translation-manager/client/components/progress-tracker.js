class ProgressTracker {
    constructor() {
        this.translationStats = {
            success: 0,
            unchanged: 0,
            error: 0,
            total: 0,
            progress: 0
        };
        this.translationStartTime = null;
        this.activeLocales = new Map();
        
        this.setupWebSocketListeners();
    }

    setupWebSocketListeners() {
        if (window.wsClient) {
            wsClient.on('translation_start', (event) => this.onTranslationStart(event.detail));
            wsClient.on('batch_processing', (event) => this.onBatchProcessing(event.detail));
            wsClient.on('key_translated', (event) => this.onKeyTranslated(event.detail));
            wsClient.on('batch_complete', (event) => this.onBatchComplete(event.detail));
            wsClient.on('translation_complete', (event) => this.onTranslationComplete(event.detail));
            wsClient.on('batch_error', (event) => this.onBatchError(event.detail));
            wsClient.on('translation_cancelled', (event) => this.onTranslationCancelled(event.detail));
            wsClient.on('translation_paused', (event) => this.onTranslationPaused(event.detail));
            wsClient.on('translation_resumed', (event) => this.onTranslationResumed(event.detail));
        }
    }

    render() {
        this.renderProgressUI();
        this.loadActiveTranslations();
    }

    renderProgressUI() {
        const container = document.getElementById('progress-tracker-container');
        if (!container) return;

        container.innerHTML = `
            <div class="progress-tracker">
                <div class="progress-header">
                    <h3>Translation Progress</h3>
                    <button class="btn btn-sm btn-danger" onclick="progressTracker.stopAllTranslations()">
                        Stop All
                    </button>
                </div>
                
                <div id="ai-progress-idle" class="progress-idle">
                    <p class="text-muted">No active translations</p>
                    <button class="btn btn-primary" onclick="router.navigateTo('ai-translate')">
                        Start Translation
                    </button>
                </div>
                
                <div id="ai-progress-active" class="progress-active hidden">
                    <div class="overall-progress">
                        <div class="progress-stats">
                            <div class="stat">
                                <span class="stat-value" id="ai-progress-count">0 / 0</span>
                                <span class="stat-label">Keys</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value" id="ai-batch-locale">-</span>
                                <span class="stat-label">Locale</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value" id="ai-batch-info">-</span>
                                <span class="stat-label">Batch</span>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="ai-progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <div class="translation-summary" id="translation-summary">
                        <div class="summary-item success">
                            <span class="summary-count" id="success-count">0</span>
                            <span class="summary-label">Success</span>
                        </div>
                        <div class="summary-item unchanged">
                            <span class="summary-count" id="unchanged-count">0</span>
                            <span class="summary-label">Unchanged</span>
                        </div>
                        <div class="summary-item error">
                            <span class="summary-count" id="error-count">0</span>
                            <span class="summary-label">Errors</span>
                        </div>
                    </div>
                </div>
                
                <div id="active-translations" class="active-translations">
                    <!-- Active translations will be rendered here -->
                </div>
                
                <div id="live-feed" class="live-feed">
                    <h4>Live Feed</h4>
                    <div class="feed-controls">
                        <button class="btn btn-sm btn-secondary" onclick="progressTracker.clearLiveFeed()">
                            Clear Feed
                        </button>
                        <label>
                            <input type="checkbox" id="auto-scroll-feed" checked> Auto-scroll
                        </label>
                    </div>
                    <div class="feed-content" id="live-feed-content">
                        <!-- Live feed items will appear here -->
                    </div>
                </div>
            </div>
        `;
    }

    async loadActiveTranslations() {
        try {
            const data = await apiClient.getActiveTranslations();
            this.renderActiveTranslations(data.active || []);
        } catch (error) {
            console.error('Error loading active translations:', error);
        }
    }

    renderActiveTranslations(translations) {
        const container = document.getElementById('active-translations');
        if (!container) return;

        if (translations.length === 0) {
            container.innerHTML = '';
            return;
        }

        const html = translations.map(translation => `
            <div class="active-translation-card" data-locale="${translation.locale}">
                <div class="translation-header">
                    <h4>${translation.locale}</h4>
                    <div class="translation-controls">
                        ${translation.isPaused ? 
                            `<button class="btn btn-sm btn-success" onclick="progressTracker.resumeTranslation('${translation.locale}')">Resume</button>` :
                            `<button class="btn btn-sm btn-warning" onclick="progressTracker.pauseTranslation('${translation.locale}')">Pause</button>`
                        }
                        <button class="btn btn-sm btn-danger" onclick="progressTracker.stopTranslation('${translation.locale}')">Stop</button>
                    </div>
                </div>
                <div class="translation-info">
                    <div class="info-item">
                        <span class="info-label">Mode:</span>
                        <span class="info-value">${translation.mode}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Duration:</span>
                        <span class="info-value">${UIUtils.formatDuration(translation.startTime)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="info-value ${translation.isPaused ? 'paused' : 'active'}">
                            ${translation.isPaused ? 'Paused' : 'Active'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    onTranslationStart(data) {
        this.translationStartTime = Date.now();
        this.translationStats = {
            success: 0,
            unchanged: 0,
            error: 0,
            total: data.totalKeys,
            progress: 0
        };
        
        // Show progress UI
        UIUtils.show('ai-progress-active');
        UIUtils.hide('ai-progress-idle');
        
        // Update initial stats
        UIUtils.setText('ai-progress-count', `0 / ${data.totalKeys} keys`);
        UIUtils.setText('ai-batch-locale', `Locale: ${data.locale}`);
        
        // Update locale-specific progress card
        this.updateLocaleProgress(data.locale, {
            status: 'Processing',
            progressText: `0 / ${data.totalKeys} keys`,
            percent: 0,
            totalBatches: data.totalBatches || 0,
            currentBatch: 0,
            completed: 0,
            errors: 0
        });
        
        // Add to live feed
        this.addToLiveFeed(`🚀 Starting translation for ${data.locale} - ${data.totalKeys} keys`, 'info');
        
        // Add to logs
        if (window.dashboard) {
            dashboard.addLog(`Started translation for ${data.locale} (${data.totalKeys} keys)`, 'info');
        }
    }

    onBatchProcessing(data) {
        UIUtils.setText('ai-batch-info', `Batch ${data.batchNumber}/${data.totalBatches}`);
        
        // Update locale-specific progress card
        this.updateLocaleProgress(data.locale, {
            currentBatch: data.batchNumber,
            totalBatches: data.totalBatches,
            progressText: `Processing batch ${data.batchNumber}/${data.totalBatches}`
        });
        
        this.addToLiveFeed(`📦 Processing batch ${data.batchNumber} - ${data.batchSize} keys`, 'process');
    }

    onKeyTranslated(data) {
        // Update stats based on status
        if (data.status === 'success') {
            this.translationStats.success++;
            this.addToLiveFeed(`✅ ${data.key}: "${data.translated}"`, 'success');
        } else if (data.status === 'unchanged') {
            this.translationStats.unchanged++;
            this.addToLiveFeed(`⚠️ ${data.key}: Unchanged`, 'unchanged');
        }
        
        this.translationStats.progress = data.progress;
        
        // Update UI
        const percent = Math.round((data.progress / data.total) * 100);
        UIUtils.setText('ai-progress-count', `${data.progress} / ${data.total} keys`);
        
        const progressBar = document.getElementById('ai-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        
        // Update summary counts
        UIUtils.setText('success-count', this.translationStats.success);
        UIUtils.setText('unchanged-count', this.translationStats.unchanged);
        UIUtils.setText('error-count', this.translationStats.error);
        
        // Update locale-specific progress card
        this.updateLocaleProgress(data.locale, {
            progressText: `${data.progress} / ${data.total} keys`,
            percent: percent,
            completed: this.translationStats.success
        });
    }

    onBatchComplete(data) {
        this.addToLiveFeed(`✅ Batch ${data.batchNumber} completed - ${data.successCount} success, ${data.unchangedCount} unchanged`, 'success');
    }

    onTranslationComplete(data) {
        // Reset progress UI
        UIUtils.hide('ai-progress-active');
        UIUtils.show('ai-progress-idle');
        
        const duration = this.translationStartTime ? UIUtils.formatDuration(this.translationStartTime) : 'unknown';
        
        this.addToLiveFeed(`🎉 Translation completed for ${data.locale} in ${duration} - ${data.successCount} success, ${data.unchangedCount} unchanged, ${data.errorCount} errors`, 'success');
        
        // Add to logs
        if (window.dashboard) {
            dashboard.addLog(`Completed translation for ${data.locale} (${data.successCount} success, ${data.errorCount} errors) in ${duration}`, 'success');
        }
        
        // Refresh active translations
        this.loadActiveTranslations();
        
        // Refresh dashboard if visible
        if (window.dashboard && router.getCurrentRoute() === 'dashboard') {
            dashboard.render();
        }
    }

    onBatchError(data) {
        this.translationStats.error++;
        UIUtils.setText('error-count', this.translationStats.error);
        this.addToLiveFeed(`❌ Batch ${data.batchNumber} error: ${data.error}`, 'error');
    }

    onTranslationCancelled(data) {
        this.addToLiveFeed(`🛑 Translation cancelled for ${data.locale}`, 'warning');
        
        if (window.dashboard) {
            dashboard.addLog(`Translation cancelled for ${data.locale}`, 'warning');
        }
        
        this.loadActiveTranslations();
    }

    onTranslationPaused(data) {
        this.addToLiveFeed(`⏸️ Translation paused for ${data.locale}`, 'info');
        this.loadActiveTranslations();
    }

    onTranslationResumed(data) {
        this.addToLiveFeed(`▶️ Translation resumed for ${data.locale}`, 'info');
        this.loadActiveTranslations();
    }

    updateLocaleProgress(locale, updates) {
        const card = document.querySelector(`[data-locale="${locale}"]`);
        if (!card) return;
        
        // Update progress text
        if (updates.progressText) {
            const progressText = card.querySelector('.progress-text');
            if (progressText) progressText.textContent = updates.progressText;
        }
        
        // Update progress bar
        if (updates.percent !== undefined) {
            const progressFill = card.querySelector('.progress-fill');
            if (progressFill) progressFill.style.width = `${updates.percent}%`;
        }
        
        // Update status
        if (updates.status) {
            const statusEl = card.querySelector('.locale-status');
            if (statusEl) statusEl.textContent = updates.status;
        }
    }

    addToLiveFeed(message, type = 'info') {
        const container = document.getElementById('live-feed-content');
        if (!container) return;
        
        const item = document.createElement('div');
        item.className = `feed-item feed-${type}`;
        item.innerHTML = `
            <span class="feed-time">${new Date().toLocaleTimeString()}</span>
            <span class="feed-message">${message}</span>
        `;
        
        container.appendChild(item);
        
        // Auto-scroll if enabled
        const autoScroll = document.getElementById('auto-scroll-feed');
        if (autoScroll && autoScroll.checked) {
            container.scrollTop = container.scrollHeight;
        }
        
        // Limit feed items
        while (container.children.length > 100) {
            container.removeChild(container.firstChild);
        }
    }

    clearLiveFeed() {
        const container = document.getElementById('live-feed-content');
        if (container) {
            container.innerHTML = '';
        }
        UIUtils.showSuccess('Live feed cleared');
    }

    async stopTranslation(locale) {
        try {
            await apiClient.stopTranslation(locale);
            UIUtils.showSuccess(`Stopped translation for ${locale}`);
        } catch (error) {
            console.error('Error stopping translation:', error);
            UIUtils.showError(`Failed to stop translation for ${locale}`);
        }
    }

    async stopAllTranslations() {
        try {
            await apiClient.stopAllTranslations();
            UIUtils.showSuccess('Stopped all translations');
        } catch (error) {
            console.error('Error stopping all translations:', error);
            UIUtils.showError('Failed to stop all translations');
        }
    }

    async pauseTranslation(locale) {
        try {
            await apiClient.pauseTranslation(locale);
            UIUtils.showSuccess(`Paused translation for ${locale}`);
        } catch (error) {
            console.error('Error pausing translation:', error);
            UIUtils.showError(`Failed to pause translation for ${locale}`);
        }
    }

    async resumeTranslation(locale) {
        try {
            await apiClient.resumeTranslation(locale);
            UIUtils.showSuccess(`Resumed translation for ${locale}`);
        } catch (error) {
            console.error('Error resuming translation:', error);
            UIUtils.showError(`Failed to resume translation for ${locale}`);
        }
    }
}

// Create singleton instance
window.progressTracker = new ProgressTracker();