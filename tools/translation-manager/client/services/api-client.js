class ApiClient {
    constructor() {
        this.baseUrl = this.getApiBaseUrl();
    }

    getApiBaseUrl() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? `http://${window.location.hostname}:5000`
            : '';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}/api${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Locale management
    async getLocales() {
        return this.request('/locales');
    }

    async getLocaleKeys(locale) {
        return this.request(`/locales/${locale}/keys`);
    }

    async updateLocaleKey(locale, key, value) {
        return this.request(`/locales/${locale}/keys`, {
            method: 'PUT',
            body: JSON.stringify({ key, value })
        });
    }

    async getLocaleConfig() {
        return this.request('/locale-config');
    }

    async saveLocaleConfig(config) {
        return this.request('/locale-config', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }

    async syncTranslations(locales) {
        return this.request('/sync-translations', {
            method: 'POST',
            body: JSON.stringify({ locales })
        });
    }

    async findBadKeys() {
        return this.request('/find-bad-keys');
    }

    async cleanValues(locales) {
        return this.request('/clean-values', {
            method: 'POST',
            body: JSON.stringify({ locales })
        });
    }

    async findNonTranslatable() {
        return this.request('/find-non-translatable');
    }

    async removeNonTranslatable(keys, locales) {
        return this.request('/remove-non-translatable', {
            method: 'POST',
            body: JSON.stringify({ keys, locales })
        });
    }

    async deleteLocale(code) {
        return this.request(`/locales/${code}`, {
            method: 'DELETE'
        });
    }

    async getLocaleKey(locale, key) {
        return this.request(`/locales/${locale}/key?key=${encodeURIComponent(key)}`);
    }

    // Translation services
    async translateKey(text, targetLocale, context = '') {
        return this.request('/ai-translate-key', {
            method: 'POST',
            body: JSON.stringify({ text, targetLocale, context })
        });
    }

    async translateClaude(data) {
        return this.request('/translate/claude', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async startBatchTranslation(targetLocale, mode, priority, batchSize = 10) {
        return this.request('/ai-translate', {
            method: 'POST',
            body: JSON.stringify({ targetLocale, mode, priority, batchSize })
        });
    }

    // Translation management
    async getActiveTranslations() {
        return this.request('/translations/active');
    }

    async stopTranslation(locale) {
        return this.request(`/translations/stop/${locale}`, {
            method: 'POST'
        });
    }

    async stopAllTranslations() {
        return this.request('/translations/stop-all', {
            method: 'POST'
        });
    }

    async pauseTranslation(locale) {
        return this.request(`/translations/pause/${locale}`, {
            method: 'POST'
        });
    }

    async resumeTranslation(locale) {
        return this.request(`/translations/resume/${locale}`, {
            method: 'POST'
        });
    }

    // Untranslatable texts
    async scanUntranslatable() {
        return this.request('/untranslatable/scan');
    }

    async getUntranslatableConfig() {
        return this.request('/untranslatable/config');
    }

    async addUntranslatablePattern(pattern, skipExistingMatches = true) {
        return this.request('/untranslatable/config/pattern', {
            method: 'POST',
            body: JSON.stringify({ pattern, skipExistingMatches })
        });
    }

    async deleteUntranslatablePattern(id) {
        return this.request(`/untranslatable/config/pattern/${id}`, {
            method: 'DELETE'
        });
    }

    async toggleUntranslatablePattern(id) {
        return this.request(`/untranslatable/config/pattern/${id}/toggle`, {
            method: 'PATCH'
        });
    }

    async cleanUntranslatable(items) {
        return this.request('/untranslatable/clean', {
            method: 'POST',
            body: JSON.stringify({ items })
        });
    }

    // Comparison tools
    async compareLocales(source, target) {
        return this.request('/compare', {
            method: 'POST',
            body: JSON.stringify({ source, target })
        });
    }

    async getComparison(source, target) {
        return this.request(`/compare/${source}/${target}`);
    }

    async findIdentical(sourceLocale = 'en', targetLocale) {
        return this.request('/identical', {
            method: 'POST',
            body: JSON.stringify({ sourceLocale, targetLocale })
        });
    }

    // Orphaned keys
    async scanOrphaned() {
        return this.request('/orphaned/scan');
    }

    async restoreOrphaned(keys) {
        return this.request('/orphaned/restore', {
            method: 'POST',
            body: JSON.stringify({ keys })
        });
    }

    async cleanOrphaned(keys) {
        return this.request('/orphaned/clean', {
            method: 'POST',
            body: JSON.stringify({ keys })
        });
    }

    // JSX cleanup
    async scanJsx() {
        return this.request('/jsx/scan');
    }

    async cleanJsx(items) {
        return this.request('/jsx/clean', {
            method: 'POST',
            body: JSON.stringify({ items })
        });
    }

    // Tools
    async getToolsInfo() {
        return this.request('/tools/info');
    }

    async runTool(toolName) {
        return this.request(`/tools/${toolName}`, {
            method: 'POST'
        });
    }

    // Master data
    async getMasterData() {
        return this.request('/master-data');
    }

    async saveMasterData(translations) {
        return this.request('/master-data', {
            method: 'POST',
            body: JSON.stringify({ translations })
        });
    }
}

// Export singleton instance
window.apiClient = new ApiClient();