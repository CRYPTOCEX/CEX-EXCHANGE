// AI Translation Page
(function() {
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:5000`
        : '';

    function render() {
        return `
            <div class="max-w-6xl mx-auto">
                <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-robot text-purple-600 mr-3"></i>AI Translation with Claude
                    </h2>

                    <!-- Documentation Box -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 class="font-semibold text-blue-900 mb-2">How This Works:</h3>
                        <ul class="space-y-2 text-sm text-blue-800">
                            <li><strong>Batch Processing:</strong> Translations are sent to Claude in batches (10-100 keys) to minimize API calls</li>
                            <li><strong>Smart Grouping:</strong> Related keys are grouped together for better context</li>
                            <li><strong>Context Preserved:</strong> Placeholders like {name}, %s, %d are maintained</li>
                            <li><strong>Parallel Processing:</strong> Multiple locales can be translated simultaneously</li>
                        </ul>
                        <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p class="text-xs text-yellow-800">
                                <strong>Note:</strong> Claude must be installed and available. Each batch takes 2-5 seconds to process.
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-lg font-semibold mb-4">Translation Settings</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Target Locales</label>
                                    <div class="flex items-center gap-4 mb-2">
                                        <div class="flex items-center">
                                            <input type="checkbox" id="ai-select-all-locales" class="mr-2">
                                            <label for="ai-select-all-locales" class="text-sm font-medium">Select All</label>
                                        </div>
                                        <button type="button" id="ai-select-incomplete" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                            Select Incomplete (&lt;100%)
                                        </button>
                                        <button type="button" id="ai-select-none" class="text-sm text-gray-600 hover:text-gray-800 font-medium">
                                            Clear Selection
                                        </button>
                                    </div>
                                    <div id="ai-locale-checkboxes" class="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                        <!-- Checkboxes will be populated here -->
                                    </div>
                                    <p class="text-xs text-gray-500 mt-1">Select multiple locales to translate them all at once</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Translation Mode</label>
                                    <select id="ai-mode" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="missing">Only Missing Translations</option>
                                        <option value="identical">Identical Values Only</option>
                                        <option value="both">Missing + Identical</option>
                                        <option value="all">Review All Translations</option>
                                    </select>
                                    <p class="text-xs text-gray-500 mt-1">Missing = keys not in file. Identical = same as English.</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Context Priority</label>
                                    <select id="ai-priority" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="high">High Priority Only</option>
                                        <option value="medium">Medium & High Priority</option>
                                        <option value="all" selected>All Priorities</option>
                                    </select>
                                    <p class="text-xs text-gray-500 mt-1">High = user-facing, Medium = settings, Low = technical</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Batch Size</label>
                                    <select id="ai-batch-size" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="10">10 keys per batch (safest)</option>
                                        <option value="25" selected>25 keys per batch (recommended)</option>
                                        <option value="50">50 keys per batch</option>
                                        <option value="75">75 keys per batch</option>
                                        <option value="100">100 keys per batch (max safe)</option>
                                    </select>
                                    <p class="text-xs text-gray-500 mt-1">Batches over 100 may exceed API output limits</p>
                                </div>
                            </div>

                            <div class="mt-6 flex gap-4">
                                <button id="start-ai-translation" class="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">
                                    <i class="fas fa-play mr-2"></i>Start AI Translation
                                </button>
                                <button id="stop-all-translations" class="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold transition-all">
                                    <i class="fas fa-stop mr-2"></i>Stop All
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-lg font-semibold mb-4">Active Translations</h3>
                            <div id="active-translations-list" class="space-y-4">
                                <p class="text-gray-500 text-center py-4">No active translations</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Locale Grid -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-lg font-semibold mb-4">
                        <i class="fas fa-globe text-blue-600 mr-2"></i>Locale Overview
                    </h3>
                    <div id="ai-locale-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <!-- Locale cards will be populated here -->
                    </div>
                </div>
            </div>
        `;
    }

    function initialize() {
        // Initialize the AI translator from the existing tab
        if (window.aiTranslator) {
            window.aiTranslator.initialize();
        }
    }

    // Export
    window.AITranslatePage = {
        render,
        initialize
    };
})();
