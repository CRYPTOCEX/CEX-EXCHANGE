// Initialization Guard to prevent multiple API calls
(function() {
    window.initializationGuard = {
        initialized: new Set(),
        
        canInitialize(key) {
            if (this.initialized.has(key)) {
                return false;
            }
            this.initialized.add(key);
            return true;
        },
        
        reset(key) {
            this.initialized.delete(key);
        },
        
        resetAll() {
            this.initialized.clear();
        }
    };
})();