class TranslationStateManager {
    constructor() {
        // Track active translation jobs to prevent duplicates
        this.activeTranslations = new Map();
        // Track cancelled translations
        this.cancelledTranslations = new Set();
        // Track paused translations
        this.pausedTranslations = new Map();
    }

    isActive(locale) {
        return this.activeTranslations.has(locale);
    }

    isCancelled(locale) {
        return this.cancelledTranslations.has(locale);
    }

    isPaused(locale) {
        return this.pausedTranslations.has(locale);
    }

    addActive(locale, data) {
        this.activeTranslations.set(locale, data);
    }

    removeActive(locale) {
        this.activeTranslations.delete(locale);
    }

    cancel(locale) {
        this.cancelledTranslations.add(locale);
        this.activeTranslations.delete(locale);
        this.pausedTranslations.delete(locale);
    }

    cancelAll() {
        for (const locale of this.activeTranslations.keys()) {
            this.cancelledTranslations.add(locale);
        }
        this.activeTranslations.clear();
        this.pausedTranslations.clear();
    }

    pause(locale) {
        const data = this.activeTranslations.get(locale);
        if (data) {
            this.pausedTranslations.set(locale, data);
            this.activeTranslations.delete(locale);
            return true;
        }
        return false;
    }

    resume(locale) {
        const data = this.pausedTranslations.get(locale);
        if (data) {
            this.activeTranslations.set(locale, data);
            this.pausedTranslations.delete(locale);
            this.cancelledTranslations.delete(locale);
            return data;
        }
        return null;
    }

    clearCancelled(locale) {
        this.cancelledTranslations.delete(locale);
    }

    getActiveTranslations() {
        return Array.from(this.activeTranslations.entries()).map(([locale, data]) => ({
            locale,
            ...data
        }));
    }

    getPausedTranslations() {
        return Array.from(this.pausedTranslations.entries()).map(([locale, data]) => ({
            locale,
            ...data,
            paused: true
        }));
    }
}

module.exports = TranslationStateManager;