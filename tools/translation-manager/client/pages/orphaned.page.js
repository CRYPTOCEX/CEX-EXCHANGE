// Orphaned Keys Page
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
                            <i class="fas fa-unlink text-red-600 mr-3"></i>Orphaned Translation Keys
                        </h2>
                        <div class="text-sm text-gray-600">
                            Find t() calls in code that don't exist in message files
                        </div>
                    </div>

                    <!-- Workflow Steps -->
                    <div class="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-4 mb-6">
                        <h3 class="font-semibold text-red-900 mb-3">Workflow Steps:</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div class="bg-white rounded-lg p-3 border border-red-200">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold">1</span>
                                    <strong class="text-red-800">Scan</strong>
                                </div>
                                <p class="text-xs text-gray-600">Find t() calls missing from message files</p>
                            </div>
                            <div class="bg-white rounded-lg p-3 border border-purple-200">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold">2</span>
                                    <strong class="text-purple-800">AI Suggest</strong>
                                </div>
                                <p class="text-xs text-gray-600">Generate English values with Claude AI</p>
                            </div>
                            <div class="bg-white rounded-lg p-3 border border-green-200">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold">3</span>
                                    <strong class="text-green-800">Add to Locales</strong>
                                </div>
                                <p class="text-xs text-gray-600">Add keys with values to message files</p>
                            </div>
                            <div class="bg-white rounded-lg p-3 border border-gray-200">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-600 text-white text-xs font-bold">4</span>
                                    <strong class="text-gray-800">Clear/Remove</strong>
                                </div>
                                <p class="text-xs text-gray-600">Clear results or remove from code</p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons - 2 Rows -->
                    <div class="space-y-3 mb-6">
                        <!-- Row 1: Main Actions -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button id="scan-orphaned" class="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md">
                                <i class="fas fa-search"></i>
                                <span>Scan</span>
                            </button>
                            <button id="ai-suggest-orphaned" disabled class="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md">
                                <i class="fas fa-robot"></i>
                                <span>AI Suggest</span>
                            </button>
                            <button id="restore-orphaned" disabled class="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md">
                                <i class="fas fa-plus"></i>
                                <span>Add to Locales</span>
                            </button>
                        </div>
                        <!-- Row 2: Secondary Actions -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button id="clean-orphaned" disabled class="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md">
                                <i class="fas fa-broom"></i>
                                <span>Remove from Code</span>
                            </button>
                            <button id="clear-orphaned" disabled class="flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md">
                                <i class="fas fa-times"></i>
                                <span>Clear Results</span>
                            </button>
                        </div>
                    </div>

                    <!-- Agent Settings -->
                    <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                        <h4 class="font-semibold text-purple-800 mb-2">
                            <i class="fas fa-robot mr-2"></i>Parallel Agent Settings
                        </h4>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-xs text-purple-700 mb-1">Batch Size (keys per agent)</label>
                                <select id="orphaned-batch-size" class="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm">
                                    <option value="5">5 keys</option>
                                    <option value="10" selected>10 keys</option>
                                    <option value="15">15 keys</option>
                                    <option value="20">20 keys</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs text-purple-700 mb-1">Max Parallel Agents</label>
                                <select id="orphaned-max-agents" class="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm">
                                    <option value="2">2 agents</option>
                                    <option value="3">3 agents</option>
                                    <option value="5" selected>5 agents</option>
                                    <option value="8">8 agents</option>
                                    <option value="10">10 agents</option>
                                </select>
                            </div>
                            <div class="flex items-end">
                                <div class="text-xs text-purple-600">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    More agents = faster AI suggestions
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <input type="text" id="orphaned-filter" placeholder="Filter by key or value..."
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                        </div>
                        <div>
                            <select id="orphaned-namespace" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                                <option value="">All Namespaces</option>
                            </select>
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" id="select-all-orphaned" disabled class="mr-2">
                            <label for="select-all-orphaned" class="text-sm">Select All Visible</label>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div id="orphaned-stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" style="display: none;">
                        <div class="bg-blue-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-blue-600" id="orphaned-files">0</div>
                            <div class="text-sm text-gray-600">Files Scanned</div>
                        </div>
                        <div class="bg-green-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-green-600" id="orphaned-total-keys">0</div>
                            <div class="text-sm text-gray-600">Total Keys in Messages</div>
                        </div>
                        <div class="bg-red-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-red-600" id="orphaned-count">0</div>
                            <div class="text-sm text-gray-600">Orphaned Keys</div>
                        </div>
                        <div class="bg-purple-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-purple-600" id="orphaned-selected">0</div>
                            <div class="text-sm text-gray-600">Selected</div>
                        </div>
                    </div>

                    <!-- Messages -->
                    <div id="orphaned-success" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" style="display: none;"></div>
                    <div id="orphaned-error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" style="display: none;"></div>
                </div>

                <!-- Loading -->
                <div id="orphaned-loading" class="text-center py-8" style="display: none;">
                    <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">Scanning TSX files for orphaned keys...</p>
                </div>

                <!-- Empty State -->
                <div id="orphaned-empty" class="bg-white rounded-lg shadow-lg p-6 text-center">
                    <i class="fas fa-search text-4xl mb-4 text-gray-400"></i>
                    <h3 class="text-lg font-semibold mb-2">Ready to Scan</h3>
                    <p class="text-gray-600">Click "Scan for Orphaned Keys" to find translation keys in code that are missing from message files.</p>
                </div>

                <!-- Results Table -->
                <div id="orphaned-results" class="bg-white rounded-lg shadow-lg p-6" style="display: none;">
                    <h3 class="text-lg font-semibold mb-4">
                        <i class="fas fa-list mr-2"></i>Orphaned Keys
                    </h3>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="border p-2 w-10">
                                        <input type="checkbox" id="orphaned-table-select-all">
                                    </th>
                                    <th class="border p-2 text-left">Namespace</th>
                                    <th class="border p-2 text-left">Key</th>
                                    <th class="border p-2 text-left">Suggested Value</th>
                                    <th class="border p-2 text-left">Files</th>
                                </tr>
                            </thead>
                            <tbody id="orphaned-tbody">
                                <!-- Results will be populated here -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Unused Keys Section (Reverse Orphan Scan) -->
                <div class="bg-white rounded-lg shadow-lg p-6 mt-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-broom text-yellow-600 mr-3"></i>Unused Translation Keys
                        </h2>
                        <div class="text-sm text-gray-600">
                            Find keys in message files that aren't used in code
                        </div>
                    </div>

                    <!-- Info Box -->
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <h3 class="font-semibold text-yellow-900 mb-2">What This Does:</h3>
                        <ul class="space-y-1 text-sm text-yellow-800">
                            <li><strong>Scans:</strong> Checks all keys in en.json message file</li>
                            <li><strong>Searches:</strong> Looks for usage in TSX/TS files (t("key") patterns)</li>
                            <li><strong>Identifies:</strong> Keys that exist in messages but are never used in code</li>
                            <li><strong>Remove:</strong> Safely removes unused keys from ALL locale files</li>
                        </ul>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex flex-wrap gap-4 mb-6">
                        <button id="scan-unused" class="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">
                            <i class="fas fa-search mr-2"></i>Scan Unused Keys
                        </button>
                        <button id="remove-unused" disabled class="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">
                            <i class="fas fa-trash mr-2"></i>Remove Selected
                        </button>
                        <button id="clear-unused" disabled class="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">
                            <i class="fas fa-times mr-2"></i>Clear Results
                        </button>
                    </div>

                    <!-- Select All -->
                    <div class="flex items-center mb-4">
                        <input type="checkbox" id="select-all-unused" disabled class="mr-2">
                        <label for="select-all-unused" class="text-sm">Select All Visible</label>
                        <span id="unused-selected-count" class="ml-4 text-sm text-gray-600">(0 selected)</span>
                    </div>

                    <!-- Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <input type="text" id="unused-filter" placeholder="Filter by key or value..."
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
                        </div>
                        <div>
                            <select id="unused-namespace" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
                                <option value="">All Namespaces</option>
                            </select>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div id="unused-stats" class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6" style="display: none;">
                        <div class="bg-blue-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-blue-600" id="unused-total-keys">0</div>
                            <div class="text-sm text-gray-600">Total Keys in Messages</div>
                        </div>
                        <div class="bg-green-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-green-600" id="unused-used-keys">0</div>
                            <div class="text-sm text-gray-600">Used in Code</div>
                        </div>
                        <div class="bg-yellow-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-yellow-600" id="unused-count">0</div>
                            <div class="text-sm text-gray-600">Unused Keys</div>
                        </div>
                    </div>

                    <!-- Messages -->
                    <div id="unused-success" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" style="display: none;"></div>
                    <div id="unused-error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" style="display: none;"></div>

                    <!-- Loading -->
                    <div id="unused-loading" class="text-center py-8" style="display: none;">
                        <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600">Scanning message files for unused keys...</p>
                    </div>

                    <!-- Empty State -->
                    <div id="unused-empty" class="text-center py-8">
                        <i class="fas fa-search text-4xl mb-4 text-gray-400"></i>
                        <h3 class="text-lg font-semibold mb-2">Ready to Scan</h3>
                        <p class="text-gray-600">Click "Scan Unused Keys" to find translation keys that exist in message files but aren't used anywhere in the codebase.</p>
                    </div>

                    <!-- Results Table -->
                    <div id="unused-results" style="display: none;">
                        <h3 class="text-lg font-semibold mb-4">
                            <i class="fas fa-list mr-2"></i>Unused Keys
                        </h3>
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse">
                                <thead>
                                    <tr class="bg-gray-100">
                                        <th class="border p-2 w-10">
                                            <input type="checkbox" id="unused-table-select-all">
                                        </th>
                                        <th class="border p-2 text-left">Namespace</th>
                                        <th class="border p-2 text-left">Key</th>
                                        <th class="border p-2 text-left">Value</th>
                                    </tr>
                                </thead>
                                <tbody id="unused-tbody">
                                    <!-- Results will be populated here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function initialize() {
        // Initialize the orphaned tab from existing JS
        if (window.orphanedTab) {
            window.orphanedTab.initialize();
        }
    }

    // Export
    window.OrphanedPage = {
        render,
        initialize
    };
})();
