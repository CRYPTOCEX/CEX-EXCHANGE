// Extract Menu Translations Page
(function() {
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:5000`
        : '';

    let scanResults = null;

    function render() {
        return `
            <div class="max-w-6xl mx-auto">
                <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-list text-blue-600 mr-3"></i>Extract Menu Translations
                        </h2>
                    </div>
                    <p class="text-gray-600 mb-6">
                        Automatically extracts all menu titles and descriptions from
                        <code class="bg-gray-100 px-2 py-1 rounded">frontend/config/menu.ts</code>
                        and adds them to all locale files. Generates translation keys in format:
                        <code class="bg-gray-100 px-2 py-1 rounded">menu.{key}.{field}</code>
                    </p>

                    <!-- Source File Info -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div class="flex items-center">
                            <i class="fas fa-file-code text-blue-600 text-xl mr-3"></i>
                            <div>
                                <div class="font-medium text-blue-800">Source File</div>
                                <div class="text-sm text-blue-600 font-mono">frontend/config/menu.ts</div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-4">
                        <button id="analyze-menu-btn" class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">
                            <i class="fas fa-search mr-2"></i>Analyze Menu
                        </button>
                        <button id="apply-menu-btn" class="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            <i class="fas fa-check mr-2"></i>Apply Translations
                        </button>
                    </div>
                </div>

                <!-- Analysis Results -->
                <div id="menu-analysis-results" class="hidden">
                    <!-- Stats Summary -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-blue-600" id="menu-stat-total">0</div>
                            <div class="text-sm text-gray-600">Total Translations</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-green-600" id="menu-stat-new">0</div>
                            <div class="text-sm text-gray-600">New Keys</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-orange-600" id="menu-stat-existing">0</div>
                            <div class="text-sm text-gray-600">Already Exist</div>
                        </div>
                    </div>

                    <!-- Translations Table -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-list-ul mr-2"></i>Menu Translations Preview
                        </h3>

                        <!-- Filters -->
                        <div class="flex gap-4 mb-4">
                            <input type="text" id="menu-filter" placeholder="Filter translations..."
                                class="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <select id="menu-type-filter" class="p-2 border border-gray-300 rounded-lg">
                                <option value="">All Types</option>
                                <option value="title">Titles Only</option>
                                <option value="description">Descriptions Only</option>
                            </select>
                            <select id="menu-status-filter" class="p-2 border border-gray-300 rounded-lg">
                                <option value="">All Status</option>
                                <option value="new">New Only</option>
                                <option value="exists">Existing Only</option>
                            </select>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="text-left text-gray-500 border-b bg-gray-50">
                                        <th class="p-3 w-16">Line</th>
                                        <th class="p-3 w-32">Type</th>
                                        <th class="p-3">Value</th>
                                        <th class="p-3">Translation Key</th>
                                        <th class="p-3 w-24">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="menu-translations-body">
                                    <!-- Translations will be rendered here -->
                                </tbody>
                            </table>
                        </div>

                        <div id="menu-pagination" class="mt-4 flex items-center justify-between text-sm text-gray-600">
                            <span id="menu-showing"></span>
                            <div class="flex gap-2">
                                <button id="menu-prev-btn" class="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                                <button id="menu-next-btn" class="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Apply Results -->
                <div id="menu-apply-results" class="hidden">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div class="flex items-center mb-4">
                            <i class="fas fa-check-circle text-green-600 text-3xl mr-4"></i>
                            <div>
                                <h3 class="text-xl font-bold text-green-800">Menu Extraction Complete!</h3>
                                <p class="text-green-700" id="menu-apply-summary"></p>
                            </div>
                        </div>
                        <div class="mt-4 p-4 bg-white rounded-lg">
                            <h4 class="font-semibold text-gray-800 mb-2">Next Steps:</h4>
                            <ol class="list-decimal list-inside text-sm text-gray-600 space-y-1">
                                <li>Review the extracted translations in locale files</li>
                                <li>Use AI Translation to translate menu items to other languages</li>
                                <li>Update your menu components to use <code class="bg-gray-100 px-1 rounded">useTranslations()</code></li>
                                <li>Test menu translations by switching languages</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    let currentPage = 1;
    const pageSize = 20;
    let filteredTranslations = [];

    async function initialize() {
        setupEventListeners();
    }

    function setupEventListeners() {
        const analyzeBtn = document.getElementById('analyze-menu-btn');
        const applyBtn = document.getElementById('apply-menu-btn');
        const filterInput = document.getElementById('menu-filter');
        const typeFilter = document.getElementById('menu-type-filter');
        const statusFilter = document.getElementById('menu-status-filter');
        const prevBtn = document.getElementById('menu-prev-btn');
        const nextBtn = document.getElementById('menu-next-btn');

        if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeMenu);
        if (applyBtn) applyBtn.addEventListener('click', applyMenuTranslations);
        if (filterInput) filterInput.addEventListener('input', applyFilters);
        if (typeFilter) typeFilter.addEventListener('change', applyFilters);
        if (statusFilter) statusFilter.addEventListener('change', applyFilters);
        if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderTable(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderTable(); });
    }

    async function analyzeMenu() {
        const analyzeBtn = document.getElementById('analyze-menu-btn');
        const applyBtn = document.getElementById('apply-menu-btn');
        const resultsDiv = document.getElementById('menu-analysis-results');
        const applyResultsDiv = document.getElementById('menu-apply-results');

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
        applyResultsDiv?.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE}/api/tools/scan-menu`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze menu');
            }

            scanResults = data;
            filteredTranslations = data.translations || [];
            currentPage = 1;

            // Update stats
            document.getElementById('menu-stat-total').textContent = data.stats?.totalTranslations || 0;
            document.getElementById('menu-stat-new').textContent = data.stats?.newKeys || 0;
            document.getElementById('menu-stat-existing').textContent = data.stats?.existingKeys || 0;

            renderTable();
            resultsDiv?.classList.remove('hidden');
            applyBtn.disabled = !(data.stats?.newKeys > 0);

            UIUtils.showSuccess(`Found ${data.stats?.totalTranslations || 0} menu translations`);

        } catch (error) {
            console.error('Error analyzing menu:', error);
            UIUtils.showError('Analysis failed: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Analyze Menu';
        }
    }

    function applyFilters() {
        if (!scanResults?.translations) return;

        const filter = document.getElementById('menu-filter')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('menu-type-filter')?.value || '';
        const statusFilter = document.getElementById('menu-status-filter')?.value || '';

        filteredTranslations = scanResults.translations.filter(t => {
            if (filter && !t.value.toLowerCase().includes(filter) && !t.key.toLowerCase().includes(filter)) {
                return false;
            }
            if (typeFilter && t.type !== typeFilter) {
                return false;
            }
            if (statusFilter === 'new' && t.exists) {
                return false;
            }
            if (statusFilter === 'exists' && !t.exists) {
                return false;
            }
            return true;
        });

        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById('menu-translations-body');
        const showingSpan = document.getElementById('menu-showing');
        const prevBtn = document.getElementById('menu-prev-btn');
        const nextBtn = document.getElementById('menu-next-btn');

        if (!tbody) return;

        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, filteredTranslations.length);
        const pageItems = filteredTranslations.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No translations found</td></tr>';
        } else {
            tbody.innerHTML = pageItems.map(t => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="p-3 text-gray-400">${t.line}</td>
                    <td class="p-3">
                        <span class="px-2 py-1 rounded text-xs ${t.type === 'title' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">
                            ${escapeHtml(t.type)}
                        </span>
                    </td>
                    <td class="p-3 font-mono text-sm">"${escapeHtml(truncate(t.value, 50))}"</td>
                    <td class="p-3 font-mono text-sm text-green-600">${escapeHtml(t.key)}</td>
                    <td class="p-3">
                        ${t.exists
                            ? '<span class="text-orange-500 text-xs"><i class="fas fa-check"></i> exists</span>'
                            : '<span class="text-green-500 text-xs"><i class="fas fa-plus"></i> new</span>'
                        }
                    </td>
                </tr>
            `).join('');
        }

        // Update pagination
        showingSpan.textContent = `Showing ${start + 1}-${end} of ${filteredTranslations.length}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = end >= filteredTranslations.length;
    }

    async function applyMenuTranslations() {
        const applyBtn = document.getElementById('apply-menu-btn');
        const resultsDiv = document.getElementById('menu-analysis-results');
        const applyResultsDiv = document.getElementById('menu-apply-results');

        if (!scanResults) {
            UIUtils.showWarning('Please analyze menu first');
            return;
        }

        if (!confirm(`This will add ${scanResults.stats?.newKeys || 0} menu translations to all locale files.\n\nContinue?`)) {
            return;
        }

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Applying...';

        try {
            const response = await fetch(`${API_BASE}/api/tools/extract-menu`, {
                method: 'POST'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to apply');
            }

            resultsDiv?.classList.add('hidden');
            applyResultsDiv?.classList.remove('hidden');

            document.getElementById('menu-apply-summary').textContent =
                `Extracted ${data.stats?.keysExtracted || 0} keys, updated ${data.stats?.filesUpdated || 0} locale files.`;

            scanResults = null;
            UIUtils.showSuccess('Menu translations extracted successfully!');

        } catch (error) {
            console.error('Error applying:', error);
            UIUtils.showError('Failed to apply: ' + error.message);
        } finally {
            applyBtn.disabled = true;
            applyBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Apply Translations';
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    // Export
    window.ExtractMenuPage = {
        render,
        initialize
    };
})();
