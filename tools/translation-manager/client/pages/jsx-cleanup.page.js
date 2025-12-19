// JSX Cleanup Page
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
                            <i class="fas fa-code text-indigo-600 mr-3"></i>JSX String Cleanup
                        </h2>
                        <div class="text-sm text-gray-600">
                            Find and clean unnecessary JSX expression wrappers
                        </div>
                    </div>

                    <!-- Info Box -->
                    <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                        <h3 class="font-semibold text-indigo-900 mb-2">What This Does:</h3>
                        <ul class="space-y-1 text-sm text-indigo-800">
                            <li><strong>Scans:</strong> Finds JSX expressions like <code class="bg-white px-1 rounded">{'text'}</code> that can be simplified</li>
                            <li><strong>Identifies:</strong> Static strings wrapped in unnecessary JSX expressions</li>
                            <li><strong>Cleans:</strong> Converts <code class="bg-white px-1 rounded">{'text'}</code> to just <code class="bg-white px-1 rounded">text</code></li>
                        </ul>
                        <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p class="text-xs text-yellow-800">
                                <strong>Note:</strong> This only cleans static strings. Dynamic expressions and template literals are preserved.
                            </p>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex flex-wrap gap-4 mb-6">
                        <button id="scan-jsx" class="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">
                            <i class="fas fa-search mr-2"></i>Scan JSX Files
                        </button>
                        <button id="clean-jsx" disabled class="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all">
                            <i class="fas fa-broom mr-2"></i>Clean Selected
                        </button>
                        <button id="clean-all-jsx" disabled class="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all">
                            <i class="fas fa-magic mr-2"></i>Clean All
                        </button>
                        <button id="clear-jsx" disabled class="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all">
                            <i class="fas fa-times mr-2"></i>Clear
                        </button>
                    </div>

                    <!-- Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <input type="text" id="jsx-filter" placeholder="Filter by value..."
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                        </div>
                        <div>
                            <select id="jsx-file-filter" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                <option value="">All Files</option>
                            </select>
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" id="select-all-jsx" disabled class="mr-2">
                            <label for="select-all-jsx" class="text-sm">Select All Visible</label>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div id="jsx-stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" style="display: none;">
                        <div class="bg-blue-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-blue-600" id="jsx-files-scanned">0</div>
                            <div class="text-sm text-gray-600">Files Scanned</div>
                        </div>
                        <div class="bg-orange-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-orange-600" id="jsx-total-found">0</div>
                            <div class="text-sm text-gray-600">Total Found</div>
                        </div>
                        <div class="bg-green-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-green-600" id="jsx-unique-values">0</div>
                            <div class="text-sm text-gray-600">Unique Values</div>
                        </div>
                        <div class="bg-purple-50 rounded-lg p-4 text-center">
                            <div class="text-3xl font-bold text-purple-600" id="jsx-selected">0</div>
                            <div class="text-sm text-gray-600">Selected</div>
                        </div>
                    </div>

                    <!-- Messages -->
                    <div id="jsx-success" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" style="display: none;"></div>
                    <div id="jsx-error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" style="display: none;"></div>
                </div>

                <!-- Loading -->
                <div id="jsx-loading" class="text-center py-8" style="display: none;">
                    <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">Scanning TSX files for wrapped strings...</p>
                </div>

                <!-- Empty State -->
                <div id="jsx-empty" class="bg-white rounded-lg shadow-lg p-6 text-center">
                    <i class="fas fa-code text-4xl mb-4 text-gray-400"></i>
                    <h3 class="text-lg font-semibold mb-2">Ready to Scan</h3>
                    <p class="text-gray-600">Click "Scan JSX Files" to find unnecessary string wrappers in your TSX files.</p>
                </div>

                <!-- Results Table -->
                <div id="jsx-results" class="bg-white rounded-lg shadow-lg p-6" style="display: none;">
                    <h3 class="text-lg font-semibold mb-4">
                        <i class="fas fa-list mr-2"></i>Wrapped Strings Found
                    </h3>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="border p-2 w-10">
                                        <input type="checkbox" id="jsx-table-select-all">
                                    </th>
                                    <th class="border p-2 text-left">Value</th>
                                    <th class="border p-2 text-left">Current</th>
                                    <th class="border p-2 text-left">Replacement</th>
                                    <th class="border p-2 text-left">Files</th>
                                    <th class="border p-2 text-center">Count</th>
                                </tr>
                            </thead>
                            <tbody id="jsx-tbody">
                                <!-- Results will be populated here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function initialize() {
        // Initialize the JSX cleanup tab from existing JS
        if (window.jsxCleanupTab) {
            window.jsxCleanupTab.initialize();
        }
    }

    // Export
    window.JSXCleanupPage = {
        render,
        initialize
    };
})();
