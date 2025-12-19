// Untranslatable Texts Page
(function() {
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:5000`
        : '';

    function render() {
        return `
            <div class="max-w-6xl mx-auto">
                <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-ban text-orange-600 mr-3"></i>Untranslatable Text Scanner
                        </h2>
                        <div class="text-sm text-gray-600">
                            Find and clean texts that shouldn't be translated
                        </div>
                    </div>

                    <!-- Info Box -->
                    <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                        <h3 class="font-semibold text-orange-900 mb-2">What This Does:</h3>
                        <ul class="space-y-1 text-sm text-orange-800">
                            <li><strong>Scans:</strong> Finds translation keys that contain untranslatable content (placeholders, symbols, numbers, etc.)</li>
                            <li><strong>Identifies:</strong> Keys where values are identical across all locales</li>
                            <li><strong>Remove:</strong> Removes keys from locales AND reverts TSX files back to literal strings</li>
                        </ul>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex flex-wrap gap-4 mb-6">
                        <button id="scan-untranslatable" class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">
                            <i class="fas fa-search mr-2"></i>Scan Untranslatable
                        </button>
                        <button id="remove-selected-untranslatable" disabled class="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all">
                            <i class="fas fa-trash mr-2"></i>Remove Selected
                        </button>
                        <button id="remove-all-untranslatable" disabled class="bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all">
                            <i class="fas fa-trash-alt mr-2"></i>Remove All
                        </button>
                    </div>

                    <!-- Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <input type="text" id="search-untranslatable" placeholder="Search keys or values..."
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                        </div>
                        <div>
                            <select id="type-filter-untranslatable" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                                <option value="">All Types</option>
                            </select>
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" id="select-all-untranslatable" class="mr-2">
                            <label for="select-all-untranslatable" class="text-sm">Select All Visible</label>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div id="untranslatable-stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <!-- Stats will be populated here -->
                    </div>
                </div>

                <!-- Results -->
                <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 class="text-lg font-semibold mb-4">
                        <i class="fas fa-list mr-2"></i>Scan Results
                    </h3>
                    <div id="untranslatable-results" class="space-y-4">
                        <p class="text-gray-500 text-center py-8">Click "Scan Untranslatable" to find items</p>
                    </div>
                </div>

                <!-- Pattern Configuration -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">
                            <i class="fas fa-cog mr-2"></i>Pattern Configuration
                        </h3>
                        <div class="flex gap-2">
                            <button id="add-custom-pattern" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                <i class="fas fa-plus mr-1"></i>Add Pattern
                            </button>
                            <button id="refresh-patterns" class="text-gray-600 hover:text-gray-800 text-sm font-medium">
                                <i class="fas fa-sync-alt mr-1"></i>Refresh
                            </button>
                        </div>
                    </div>
                    <div id="pattern-config-list" class="space-y-3">
                        <p class="text-gray-500 text-center py-4">Loading patterns...</p>
                    </div>
                </div>
            </div>
        `;
    }

    function initialize() {
        // Initialize the untranslatable manager from existing tab
        if (window.untranslatableManager) {
            window.untranslatableManager.initialize();
        }
    }

    // Export
    window.UntranslatablePage = {
        render,
        initialize
    };
})();
