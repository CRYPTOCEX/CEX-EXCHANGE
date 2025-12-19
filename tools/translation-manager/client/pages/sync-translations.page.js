// Sync All Translations Page
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
                            <i class="fas fa-sync text-purple-600 mr-3"></i>Sync All Translations
                        </h2>
                    </div>
                    <p class="text-gray-600 mb-6">
                        Synchronizes all translation files by adding missing keys from English (en.json) to all other locale files.
                        Never deletes existing translations - only adds missing keys with English values as placeholders.
                    </p>

                    <!-- Safety Info -->
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div class="flex items-start">
                            <i class="fas fa-shield-alt text-green-600 text-xl mr-3 mt-1"></i>
                            <div>
                                <div class="font-medium text-green-800">Safe Operation</div>
                                <div class="text-sm text-green-700">
                                    This tool only adds missing keys - it never removes or modifies existing translations.
                                    All changes are reversible.
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-4">
                        <button id="analyze-sync-btn" class="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">
                            <i class="fas fa-search mr-2"></i>Analyze Missing Keys
                        </button>
                        <button id="apply-sync-btn" class="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            <i class="fas fa-check mr-2"></i>Sync Translations
                        </button>
                    </div>
                </div>

                <!-- Analysis Results -->
                <div id="sync-analysis-results" class="hidden">
                    <!-- Overall Stats -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-blue-600" id="sync-stat-locales">0</div>
                            <div class="text-sm text-gray-600">Locale Files</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-purple-600" id="sync-stat-total-keys">0</div>
                            <div class="text-sm text-gray-600">Total Keys (English)</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-green-600" id="sync-stat-missing">0</div>
                            <div class="text-sm text-gray-600">Missing Keys Total</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-orange-600" id="sync-stat-namespaces">0</div>
                            <div class="text-sm text-gray-600">Namespaces</div>
                        </div>
                    </div>

                    <!-- Per-Locale Breakdown -->
                    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-globe mr-2"></i>Missing Keys by Locale
                        </h3>
                        <div id="locale-breakdown" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            <!-- Locale cards will be rendered here -->
                        </div>
                    </div>

                    <!-- Detailed View -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-list-ul mr-2"></i>Detailed Missing Keys
                        </h3>

                        <!-- Filters -->
                        <div class="flex gap-4 mb-4">
                            <select id="sync-locale-filter" class="flex-1 p-2 border border-gray-300 rounded-lg">
                                <option value="">All Locales</option>
                            </select>
                            <select id="sync-namespace-filter" class="flex-1 p-2 border border-gray-300 rounded-lg">
                                <option value="">All Namespaces</option>
                            </select>
                            <input type="text" id="sync-key-filter" placeholder="Filter by key..."
                                class="flex-1 p-2 border border-gray-300 rounded-lg">
                        </div>

                        <div class="overflow-x-auto max-h-96">
                            <table class="w-full text-sm">
                                <thead class="sticky top-0 bg-white">
                                    <tr class="text-left text-gray-500 border-b bg-gray-50">
                                        <th class="p-3">Locale</th>
                                        <th class="p-3">Namespace</th>
                                        <th class="p-3">Key</th>
                                        <th class="p-3">English Value</th>
                                    </tr>
                                </thead>
                                <tbody id="sync-details-body">
                                    <!-- Details will be rendered here -->
                                </tbody>
                            </table>
                        </div>

                        <div id="sync-pagination" class="mt-4 flex items-center justify-between text-sm text-gray-600">
                            <span id="sync-showing"></span>
                            <div class="flex gap-2">
                                <button id="sync-prev-btn" class="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                                <button id="sync-next-btn" class="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Apply Results -->
                <div id="sync-apply-results" class="hidden">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div class="flex items-center mb-4">
                            <i class="fas fa-check-circle text-green-600 text-3xl mr-4"></i>
                            <div>
                                <h3 class="text-xl font-bold text-green-800">Sync Complete!</h3>
                                <p class="text-green-700" id="sync-apply-summary"></p>
                            </div>
                        </div>
                        <div id="sync-apply-details" class="mt-4"></div>
                    </div>
                </div>
            </div>
        `;
    }

    let currentPage = 1;
    const pageSize = 50;
    let filteredMissingKeys = [];
    let allMissingKeys = [];

    async function initialize() {
        setupEventListeners();
    }

    function setupEventListeners() {
        const analyzeBtn = document.getElementById('analyze-sync-btn');
        const applyBtn = document.getElementById('apply-sync-btn');
        const localeFilter = document.getElementById('sync-locale-filter');
        const namespaceFilter = document.getElementById('sync-namespace-filter');
        const keyFilter = document.getElementById('sync-key-filter');
        const prevBtn = document.getElementById('sync-prev-btn');
        const nextBtn = document.getElementById('sync-next-btn');

        if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeSync);
        if (applyBtn) applyBtn.addEventListener('click', applySync);
        if (localeFilter) localeFilter.addEventListener('change', applyFilters);
        if (namespaceFilter) namespaceFilter.addEventListener('change', applyFilters);
        if (keyFilter) keyFilter.addEventListener('input', applyFilters);
        if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderTable(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderTable(); });
    }

    async function analyzeSync() {
        const analyzeBtn = document.getElementById('analyze-sync-btn');
        const applyBtn = document.getElementById('apply-sync-btn');
        const resultsDiv = document.getElementById('sync-analysis-results');
        const applyResultsDiv = document.getElementById('sync-apply-results');

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
        applyResultsDiv?.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE}/api/tools/analyze-sync`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze');
            }

            scanResults = data;

            // Update stats
            document.getElementById('sync-stat-locales').textContent = data.stats?.localeCount || 0;
            document.getElementById('sync-stat-total-keys').textContent = data.stats?.totalEnglishKeys || 0;
            document.getElementById('sync-stat-missing').textContent = data.stats?.totalMissing || 0;
            document.getElementById('sync-stat-namespaces').textContent = data.stats?.namespaceCount || 0;

            // Render locale breakdown
            renderLocaleBreakdown(data.locales || {});

            // Build flattened list for detailed view
            allMissingKeys = [];
            for (const [locale, namespaces] of Object.entries(data.missing || {})) {
                for (const [namespace, keys] of Object.entries(namespaces)) {
                    for (const [key, value] of Object.entries(keys)) {
                        allMissingKeys.push({ locale, namespace, key, value });
                    }
                }
            }

            filteredMissingKeys = [...allMissingKeys];
            currentPage = 1;

            // Populate filters
            populateFilters(data);
            renderTable();

            resultsDiv?.classList.remove('hidden');
            applyBtn.disabled = !(data.stats?.totalMissing > 0);

            UIUtils.showSuccess(`Found ${data.stats?.totalMissing || 0} missing keys across ${data.stats?.localeCount || 0} locales`);

        } catch (error) {
            console.error('Error analyzing:', error);
            UIUtils.showError('Analysis failed: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Analyze Missing Keys';
        }
    }

    function renderLocaleBreakdown(locales) {
        const container = document.getElementById('locale-breakdown');
        if (!container) return;

        container.innerHTML = Object.entries(locales).map(([locale, data]) => {
            const percentage = data.total > 0
                ? Math.round(((data.total - data.missing) / data.total) * 100)
                : 100;
            const colorClass = percentage === 100 ? 'bg-green-100 border-green-300' :
                               percentage >= 80 ? 'bg-yellow-100 border-yellow-300' :
                               'bg-red-100 border-red-300';

            return `
                <div class="p-3 rounded-lg border ${colorClass}">
                    <div class="flex items-center justify-between mb-1">
                        <span class="font-bold text-gray-800">${escapeHtml(locale)}</span>
                        <span class="text-sm font-medium">${percentage}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div class="bg-green-500 h-2 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                    <div class="text-xs text-gray-600">
                        <span class="text-red-600 font-medium">${data.missing}</span> missing of ${data.total}
                    </div>
                </div>
            `;
        }).join('');
    }

    function populateFilters(data) {
        const localeFilter = document.getElementById('sync-locale-filter');
        const namespaceFilter = document.getElementById('sync-namespace-filter');

        if (localeFilter) {
            localeFilter.innerHTML = '<option value="">All Locales</option>' +
                Object.keys(data.locales || {}).map(l =>
                    `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`
                ).join('');
        }

        if (namespaceFilter) {
            const namespaces = new Set();
            for (const ns of Object.values(data.missing || {})) {
                Object.keys(ns).forEach(n => namespaces.add(n));
            }
            namespaceFilter.innerHTML = '<option value="">All Namespaces</option>' +
                [...namespaces].sort().map(n =>
                    `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`
                ).join('');
        }
    }

    function applyFilters() {
        const localeFilter = document.getElementById('sync-locale-filter')?.value || '';
        const namespaceFilter = document.getElementById('sync-namespace-filter')?.value || '';
        const keyFilter = document.getElementById('sync-key-filter')?.value.toLowerCase() || '';

        filteredMissingKeys = allMissingKeys.filter(item => {
            if (localeFilter && item.locale !== localeFilter) return false;
            if (namespaceFilter && item.namespace !== namespaceFilter) return false;
            if (keyFilter && !item.key.toLowerCase().includes(keyFilter)) return false;
            return true;
        });

        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById('sync-details-body');
        const showingSpan = document.getElementById('sync-showing');
        const prevBtn = document.getElementById('sync-prev-btn');
        const nextBtn = document.getElementById('sync-next-btn');

        if (!tbody) return;

        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, filteredMissingKeys.length);
        const pageItems = filteredMissingKeys.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No missing keys found</td></tr>';
        } else {
            tbody.innerHTML = pageItems.map(item => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="p-3">
                        <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">${escapeHtml(item.locale)}</span>
                    </td>
                    <td class="p-3 text-purple-600 font-mono text-sm">${escapeHtml(item.namespace)}</td>
                    <td class="p-3 font-mono text-sm">${escapeHtml(item.key)}</td>
                    <td class="p-3 text-gray-600 text-sm">"${escapeHtml(truncate(String(item.value), 60))}"</td>
                </tr>
            `).join('');
        }

        showingSpan.textContent = `Showing ${filteredMissingKeys.length > 0 ? start + 1 : 0}-${end} of ${filteredMissingKeys.length}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = end >= filteredMissingKeys.length;
    }

    async function applySync() {
        const applyBtn = document.getElementById('apply-sync-btn');
        const resultsDiv = document.getElementById('sync-analysis-results');
        const applyResultsDiv = document.getElementById('sync-apply-results');

        if (!scanResults) {
            UIUtils.showWarning('Please analyze first');
            return;
        }

        if (!confirm(`This will add ${scanResults.stats?.totalMissing || 0} missing keys to locale files.\n\nContinue?`)) {
            return;
        }

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Syncing...';

        try {
            const response = await fetch(`${API_BASE}/api/tools/sync-translations`, {
                method: 'POST'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to sync');
            }

            resultsDiv?.classList.add('hidden');
            applyResultsDiv?.classList.remove('hidden');

            document.getElementById('sync-apply-summary').textContent =
                `Updated ${data.stats?.localesUpdated || 0} locale files, added ${data.stats?.keysAdded || 0} keys.`;

            if (data.results && Object.keys(data.results).length > 0) {
                document.getElementById('sync-apply-details').innerHTML = `
                    <h4 class="font-semibold text-green-800 mb-2">Keys Added by Locale:</h4>
                    <div class="grid grid-cols-4 gap-2 text-sm">
                        ${Object.entries(data.results).map(([locale, count]) => `
                            <div class="bg-white p-2 rounded">
                                <span class="font-medium">${escapeHtml(locale)}:</span>
                                <span class="text-green-600">+${count}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            scanResults = null;
            UIUtils.showSuccess('Translations synchronized successfully!');

        } catch (error) {
            console.error('Error syncing:', error);
            UIUtils.showError('Failed to sync: ' + error.message);
        } finally {
            applyBtn.disabled = true;
            applyBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Sync Translations';
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
    window.SyncTranslationsPage = {
        render,
        initialize
    };
})();
