// Optimize Keys Page
// Analyzes and optimizes translation key values - detects bad characters, semi-duplicates
(function() {
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:5000`
        : '';

    let analysisResults = null;
    let selectedBadKeys = new Set();
    let selectedDuplicates = new Set();
    let suffixDuplicates = [];
    let selectedSuffixDuplicates = new Set();
    let numberPrefixedKeys = [];
    let selectedNumberPrefixes = new Set();

    function render() {
        return `
            <div class="max-w-7xl mx-auto space-y-6">
                <!-- Page Header -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-key text-yellow-600 mr-3"></i>Optimize Keys
                        </h2>
                        <div class="text-sm text-gray-600">
                            Find and fix problematic key values and semi-duplicates
                        </div>
                    </div>
                </div>

                <!-- Card 1: Bad Values Analysis -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                            <i class="fas fa-exclamation-triangle text-red-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-red-800">Bad Values Detection</h3>
                            <p class="text-sm text-gray-600">Keys with () [] {} : that should be split</p>
                        </div>
                    </div>
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p class="text-sm text-red-700">
                            Scans for keys containing special characters, multiple sentences, or values that should be split.
                            Uses AI to suggest how to fix each problematic key.
                        </p>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <label class="flex items-center cursor-pointer">
                                <input type="checkbox" id="skip-duplicates" class="mr-2 h-4 w-4 text-red-600 rounded">
                                <span class="text-sm text-gray-800">Skip duplicate detection (faster)</span>
                            </label>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs text-blue-700 mb-1">Batch Size</label>
                                    <select id="batch-size-select" class="w-full p-2 border border-blue-300 rounded-lg text-sm">
                                        <option value="5">5 keys</option>
                                        <option value="10" selected>10 keys</option>
                                        <option value="15">15 keys</option>
                                        <option value="20">20 keys</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs text-blue-700 mb-1">Max Agents</label>
                                    <select id="max-agents-select" class="w-full p-2 border border-blue-300 rounded-lg text-sm">
                                        <option value="2">2 agents</option>
                                        <option value="3">3 agents</option>
                                        <option value="5" selected>5 agents</option>
                                        <option value="8">8 agents</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-3 mb-4">
                        <button id="analyze-keys-btn" class="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all">
                            <i class="fas fa-search-plus"></i>
                            <span>Analyze Bad Values</span>
                        </button>
                        <button id="fix-bad-keys-btn" disabled class="flex items-center gap-2 bg-red-700 hover:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all">
                            <i class="fas fa-robot"></i>
                            <span>AI Fix Selected</span>
                        </button>
                        <span id="selected-keys-count" class="self-center text-sm text-gray-500">0 selected</span>
                    </div>
                    <!-- Bad Values Results -->
                    <div id="bad-values-container" class="hidden">
                        <div class="border-t pt-4">
                            <div class="flex justify-between items-center mb-4">
                                <h4 class="font-semibold text-red-700">
                                    <i class="fas fa-list mr-2"></i>Results
                                    <span id="bad-values-count" class="ml-2 text-sm font-normal">(0 keys)</span>
                                </h4>
                                <div class="flex items-center gap-4">
                                    <input type="text" id="key-filter-input" placeholder="Filter..."
                                        class="p-2 border border-gray-300 rounded-lg text-sm w-48">
                                    <select id="key-filter-namespace" class="p-2 border border-gray-300 rounded-lg text-sm">
                                        <option value="">All Namespaces</option>
                                    </select>
                                    <label class="flex items-center cursor-pointer">
                                        <input type="checkbox" id="select-all-keys" class="mr-2 h-4 w-4 text-red-600 rounded">
                                        <span class="text-sm">Select All</span>
                                    </label>
                                </div>
                            </div>
                            <div id="bad-values-list" class="space-y-2 max-h-[400px] overflow-y-auto">
                                <!-- Bad value items will be rendered here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Summary (shown after analysis) -->
                <div id="keys-stats-container" class="hidden">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="bg-white rounded-lg shadow p-4 text-center">
                            <div class="text-3xl font-bold text-blue-600" id="stat-total-scanned">0</div>
                            <div class="text-sm text-gray-600">Keys Scanned</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4 text-center border-2 border-red-200">
                            <div class="text-3xl font-bold text-red-600" id="stat-bad-values">0</div>
                            <div class="text-sm text-gray-600">Bad Values</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4 text-center border-2 border-purple-200">
                            <div class="text-3xl font-bold text-purple-600" id="stat-semi-duplicates">0</div>
                            <div class="text-sm text-gray-600">Semi-Duplicates</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4 text-center">
                            <div class="text-3xl font-bold text-green-600" id="stat-fixable">0</div>
                            <div class="text-sm text-gray-600">Fixable</div>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Semi-Duplicates -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
                            <i class="fas fa-clone text-purple-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-purple-800">Semi-Duplicates Detection</h3>
                            <p class="text-sm text-gray-600">Similar values that can be deduplicated</p>
                        </div>
                    </div>
                    <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <p class="text-sm text-purple-700">
                            Finds keys with very similar values (like "Save" vs "save" vs "Save!") that could be merged.
                            Results appear after running "Analyze Bad Values" above (unless skipped).
                        </p>
                    </div>
                    <div class="flex flex-wrap gap-3 mb-4">
                        <button id="fix-duplicates-btn" disabled class="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all">
                            <i class="fas fa-compress-arrows-alt"></i>
                            <span>Merge Selected</span>
                        </button>
                    </div>
                    <!-- Duplicates Results -->
                    <div id="duplicates-container" class="hidden">
                        <div class="border-t pt-4">
                            <div class="flex justify-between items-center mb-4">
                                <h4 class="font-semibold text-purple-700">
                                    <i class="fas fa-list mr-2"></i>Results
                                    <span id="duplicates-count" class="ml-2 text-sm font-normal">(0 groups)</span>
                                </h4>
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" id="select-all-duplicates" class="mr-2 h-4 w-4 text-purple-600 rounded">
                                    <span class="text-sm">Select All</span>
                                </label>
                            </div>
                            <div id="duplicates-list" class="space-y-4 max-h-[500px] overflow-y-auto">
                                <!-- Duplicate groups will be rendered here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 3: Number Suffix Duplicates -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
                            <i class="fas fa-hashtag text-orange-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-orange-800">Number Suffix Duplicates</h3>
                            <p class="text-sm text-gray-600">Keys like key_1 vs key</p>
                        </div>
                    </div>
                    <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <p class="text-sm text-orange-700">
                            Finds keys ending with _1, _2, etc. that have a similar base key without the suffix.
                            These are often accidental duplicates from copy-paste. Removes the suffixed key and updates TSX files.
                        </p>
                    </div>
                    <div class="flex flex-wrap gap-3 mb-4">
                        <button id="analyze-suffix-btn" class="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-all">
                            <i class="fas fa-search"></i>
                            <span>Find Suffix Duplicates</span>
                        </button>
                        <button id="fix-suffix-btn" disabled class="flex items-center gap-2 bg-orange-700 hover:bg-orange-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all">
                            <i class="fas fa-trash-alt"></i>
                            <span>Remove Selected</span>
                        </button>
                        <span id="suffix-selected-count" class="self-center text-sm text-orange-600">0 selected</span>
                    </div>
                    <!-- Suffix Duplicates Results -->
                    <div id="suffix-duplicates-container" class="hidden">
                        <div class="border-t pt-4">
                            <div class="flex justify-between items-center mb-4">
                                <h4 class="font-semibold text-orange-700">
                                    <i class="fas fa-list mr-2"></i>Results
                                    <span id="suffix-duplicates-count" class="ml-2 text-sm font-normal">(0 keys)</span>
                                </h4>
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" id="select-all-suffix" class="mr-2 h-4 w-4 text-orange-600 rounded">
                                    <span class="text-sm">Select All</span>
                                </label>
                            </div>
                            <div id="suffix-duplicates-list" class="space-y-2 max-h-[500px] overflow-y-auto">
                                <!-- Suffix duplicate items will be rendered here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 4: Number-Prefixed Values -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100">
                            <i class="fas fa-sort-numeric-down text-teal-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-teal-800">Number-Prefixed Values</h3>
                            <p class="text-sm text-gray-600">Values like "100 per page", "2FA status"</p>
                        </div>
                    </div>
                    <div class="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                        <p class="text-sm text-teal-700">
                            Finds translation values that start with numbers. These should be split into number literals + translatable text parts.
                            <br><span class="font-mono text-xs mt-1 block">Example: "100 per page" → \`100 \${t('per_page')}\`</span>
                        </p>
                    </div>
                    <div class="flex flex-wrap gap-3 mb-4">
                        <button id="analyze-number-prefix-btn" class="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold transition-all">
                            <i class="fas fa-search"></i>
                            <span>Find Number Prefixes</span>
                        </button>
                        <button id="fix-number-prefix-btn" disabled class="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all">
                            <i class="fas fa-magic"></i>
                            <span>Fix Selected</span>
                        </button>
                        <span id="number-prefix-selected-count" class="self-center text-sm text-teal-600">0 selected</span>
                    </div>
                    <!-- Number Prefix Results -->
                    <div id="number-prefix-container" class="hidden">
                        <div class="border-t pt-4">
                            <div class="flex justify-between items-center mb-4">
                                <h4 class="font-semibold text-teal-700">
                                    <i class="fas fa-list mr-2"></i>Results
                                    <span id="number-prefix-count" class="ml-2 text-sm font-normal">(0 keys)</span>
                                </h4>
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" id="select-all-number-prefix" class="mr-2 h-4 w-4 text-teal-600 rounded">
                                    <span class="text-sm">Select All</span>
                                </label>
                            </div>
                            <div id="number-prefix-list" class="space-y-2 max-h-[500px] overflow-y-auto">
                                <!-- Number-prefixed items will be rendered here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Loading -->
                <div id="keys-loading-container" class="hidden text-center py-12 bg-white rounded-lg shadow-lg">
                    <i class="fas fa-spinner fa-spin text-5xl text-yellow-500 mb-4"></i>
                    <p class="text-gray-600" id="keys-loading-text">Analyzing keys...</p>
                </div>

                <!-- Hidden container for results compatibility -->
                <div id="keys-results-container" class="hidden"></div>

                <!-- Empty State -->
                <div id="keys-empty-container" class="bg-white rounded-lg shadow-lg p-12 text-center hidden">
                    <i class="fas fa-key text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">Ready to Optimize</h3>
                    <p class="text-gray-600">Use the tools above to scan for and fix problematic translation keys.</p>
                </div>

                <!-- Results Log -->
                <div id="keys-apply-results" class="hidden">
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-clipboard-check mr-2 text-green-600"></i>Operation Results
                        </h3>
                        <div id="keys-apply-log" class="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                            <!-- Results will be rendered here -->
                        </div>
                    </div>
                </div>

                <!-- Hidden filter for compatibility -->
                <select id="key-filter-type" class="hidden">
                    <option value="">All Issues</option>
                    <option value="bad_chars">Bad Characters</option>
                    <option value="duplicate">Semi-Duplicates</option>
                </select>
            </div>
        `;
    }

    function initialize() {
        // Bind event listeners
        document.getElementById('analyze-keys-btn')?.addEventListener('click', analyzeKeys);
        document.getElementById('fix-bad-keys-btn')?.addEventListener('click', fixBadKeys);
        document.getElementById('fix-duplicates-btn')?.addEventListener('click', fixDuplicates);
        document.getElementById('select-all-keys')?.addEventListener('change', toggleSelectAll);
        document.getElementById('select-all-duplicates')?.addEventListener('change', toggleSelectAllDuplicates);
        document.getElementById('key-filter-input')?.addEventListener('input', debounce(renderResults, 300));
        document.getElementById('key-filter-namespace')?.addEventListener('change', renderResults);
        document.getElementById('key-filter-type')?.addEventListener('change', renderResults);

        // Suffix duplicates event listeners
        document.getElementById('analyze-suffix-btn')?.addEventListener('click', analyzeSuffixDuplicates);
        document.getElementById('fix-suffix-btn')?.addEventListener('click', fixSuffixDuplicates);
        document.getElementById('select-all-suffix')?.addEventListener('change', toggleSelectAllSuffix);

        // Number prefix event listeners
        document.getElementById('analyze-number-prefix-btn')?.addEventListener('click', analyzeNumberPrefixes);
        document.getElementById('fix-number-prefix-btn')?.addEventListener('click', fixNumberPrefixes);
        document.getElementById('select-all-number-prefix')?.addEventListener('change', toggleSelectAllNumberPrefix);
    }

    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function analyzeKeys() {
        const analyzeBtn = document.getElementById('analyze-keys-btn');
        const loadingContainer = document.getElementById('keys-loading-container');
        const emptyContainer = document.getElementById('keys-empty-container');
        const resultsContainer = document.getElementById('keys-results-container');
        const statsContainer = document.getElementById('keys-stats-container');

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
        emptyContainer.classList.add('hidden');
        loadingContainer.classList.remove('hidden');
        resultsContainer.classList.add('hidden');

        try {
            const skipDuplicates = document.getElementById('skip-duplicates')?.checked;
            const url = `${API_BASE}/api/optimize-keys/analyze${skipDuplicates ? '?skipDuplicates=true' : ''}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            analysisResults = data;
            selectedBadKeys.clear();
            selectedDuplicates.clear();

            // Update stats
            document.getElementById('stat-total-scanned').textContent = data.stats.totalKeys;
            document.getElementById('stat-bad-values').textContent = data.stats.badValues;
            document.getElementById('stat-semi-duplicates').textContent = data.stats.duplicateGroups;
            document.getElementById('stat-fixable').textContent = data.stats.badValues + data.stats.duplicateGroups;

            // Populate namespace filter
            const namespaceSelect = document.getElementById('key-filter-namespace');
            namespaceSelect.innerHTML = '<option value="">All Namespaces</option>';
            data.namespaces.forEach(ns => {
                namespaceSelect.innerHTML += `<option value="${escapeHtml(ns)}">${escapeHtml(ns)}</option>`;
            });

            // Render results
            renderResults();

            statsContainer.classList.remove('hidden');
            resultsContainer.classList.remove('hidden');
            loadingContainer.classList.add('hidden');

            // Enable/disable buttons based on results
            document.getElementById('fix-bad-keys-btn').disabled = data.stats.badValues === 0;
            document.getElementById('fix-duplicates-btn').disabled = data.stats.duplicateGroups === 0;

            UIUtils.showSuccess(`Found ${data.stats.badValues} bad values and ${data.stats.duplicateGroups} duplicate groups`);

        } catch (error) {
            console.error('Analysis error:', error);
            UIUtils.showError('Analysis failed: ' + error.message);
            loadingContainer.classList.add('hidden');
            emptyContainer.classList.remove('hidden');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search-plus mr-2"></i>Analyze Keys';
        }
    }

    function renderResults() {
        if (!analysisResults) return;

        const filterText = document.getElementById('key-filter-input')?.value.toLowerCase() || '';
        const filterNamespace = document.getElementById('key-filter-namespace')?.value || '';
        const filterType = document.getElementById('key-filter-type')?.value || '';

        // Render bad values
        renderBadValues(filterText, filterNamespace, filterType);

        // Render duplicates
        renderDuplicates(filterText, filterNamespace, filterType);

        updateSelectedCount();
    }

    function renderBadValues(filterText, filterNamespace, filterType) {
        const container = document.getElementById('bad-values-container');
        const listEl = document.getElementById('bad-values-list');
        const countEl = document.getElementById('bad-values-count');

        if (!container || !listEl || !analysisResults) return;

        if (filterType === 'duplicate') {
            container.classList.add('hidden');
            return;
        }

        let filtered = analysisResults.badValues.filter(item => {
            if (filterText) {
                const matchKey = item.key.toLowerCase().includes(filterText);
                const matchValue = item.value.toLowerCase().includes(filterText);
                if (!matchKey && !matchValue) return false;
            }
            if (filterNamespace && item.namespace !== filterNamespace) return false;
            return true;
        });

        if (filtered.length === 0 && filterType !== 'bad_chars') {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        countEl.textContent = `(${filtered.length} keys)`;

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <i class="fas fa-check-circle text-2xl mb-2 text-green-500"></i>
                    <p>No bad values match your filters.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = filtered.map(item => {
            const isSelected = selectedBadKeys.has(item.id);
            const highlightedValue = highlightBadChars(item.value);
            const severityColors = {
                high: 'bg-red-100 text-red-800 border-red-300',
                medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                low: 'bg-blue-100 text-blue-800 border-blue-300'
            };
            const severityBadge = item.highestSeverity ?
                `<span class="px-2 py-0.5 rounded text-xs font-semibold ${severityColors[item.highestSeverity]}">${item.highestSeverity}</span>` : '';

            return `
                <div class="border ${isSelected ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-lg p-3 transition-all">
                    <div class="flex items-start gap-3">
                        <input type="checkbox" class="bad-key-checkbox mt-1 h-4 w-4 text-red-600 rounded"
                            data-id="${escapeHtml(item.id)}" ${isSelected ? 'checked' : ''}>
                        <div class="flex-grow min-w-0">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                ${severityBadge}
                                <span class="px-2 py-0.5 bg-gray-200 rounded text-xs font-mono">${escapeHtml(item.namespace)}</span>
                                <span class="font-mono text-sm font-semibold text-gray-800 truncate">${escapeHtml(item.key)}</span>
                            </div>
                            <div class="text-sm bg-white border border-gray-200 rounded p-2 font-mono break-all">
                                ${highlightedValue}
                            </div>
                            <div class="mt-2 text-xs text-gray-500 flex flex-wrap gap-1">
                                <i class="fas fa-exclamation-triangle mr-1"></i>
                                ${item.issues.map((issue, idx) => {
                                    const sev = item.severities ? item.severities[idx] : 'medium';
                                    const sevClass = sev === 'high' ? 'bg-red-200 text-red-700' :
                                                    sev === 'medium' ? 'bg-yellow-200 text-yellow-700' : 'bg-blue-200 text-blue-700';
                                    return `<span class="px-1.5 py-0.5 rounded ${sevClass}">${escapeHtml(issue)}</span>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind checkbox listeners
        listEl.querySelectorAll('.bad-key-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    selectedBadKeys.add(id);
                } else {
                    selectedBadKeys.delete(id);
                }
                updateSelectedCount();
            });
        });
    }

    function highlightBadChars(value) {
        if (!value) return '';
        // Only highlight characters that are ACTUALLY detected as problems
        // Based on the updated BAD_PATTERNS in the server
        const escaped = escapeHtml(value);

        // Use a safer approach - collect ranges to highlight, then apply all at once
        // to avoid cascading replacements corrupting HTML
        let result = escaped;

        // Square brackets (high) - still problematic
        result = result.replace(/(\[[^\]]*\])/g, '<mark class="bg-red-200 text-red-800 rounded">$1</mark>');

        // Semicolon (high)
        result = result.replace(/;/g, '<mark class="bg-red-200 text-red-800 rounded">;</mark>');

        // Pipe (high)
        result = result.replace(/\|/g, '<mark class="bg-red-200 text-red-800 rounded">|</mark>');

        // Double dash (medium)
        result = result.replace(/--/g, '<mark class="bg-yellow-200 text-yellow-800 rounded">--</mark>');

        // Bullet points (high)
        result = result.replace(/([•●○◦‣⁃])/g, '<mark class="bg-red-200 text-red-800 rounded">$1</mark>');

        // HTML tags (escaped) - high
        result = result.replace(/(&lt;[a-zA-Z][^&]*&gt;)/g, '<mark class="bg-red-300 text-red-900 rounded font-bold">$1</mark>');

        // Newlines shown as ↵ symbol
        result = result.replace(/\n/g, '<mark class="bg-red-300 text-red-900 rounded">↵</mark>\n');

        return result;
    }

    function renderDuplicates(filterText, filterNamespace, filterType) {
        const container = document.getElementById('duplicates-container');
        const listEl = document.getElementById('duplicates-list');
        const countEl = document.getElementById('duplicates-count');

        if (!container || !listEl || !analysisResults) return;

        if (filterType === 'bad_chars') {
            container.classList.add('hidden');
            return;
        }

        let filtered = analysisResults.duplicateGroups.filter(group => {
            if (filterText) {
                const matchValue = group.value.toLowerCase().includes(filterText);
                const matchKey = group.keys.some(k => k.key.toLowerCase().includes(filterText));
                if (!matchValue && !matchKey) return false;
            }
            if (filterNamespace) {
                if (!group.keys.some(k => k.namespace === filterNamespace)) return false;
            }
            return true;
        });

        if (filtered.length === 0 && filterType !== 'duplicate') {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        countEl.textContent = `(${filtered.length} groups)`;

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <i class="fas fa-check-circle text-2xl mb-2 text-green-500"></i>
                    <p>No duplicates match your filters.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = filtered.map(group => {
            const isSelected = selectedDuplicates.has(group.id);

            return `
                <div class="border ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200'} rounded-lg p-4 transition-all">
                    <div class="flex items-start gap-3">
                        <input type="checkbox" class="dup-group-checkbox mt-1 h-4 w-4 text-purple-600 rounded"
                            data-id="${escapeHtml(group.id)}" ${isSelected ? 'checked' : ''}>
                        <div class="flex-grow min-w-0">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-semibold text-purple-800">
                                    <i class="fas fa-clone mr-1"></i>${group.keys.length} similar keys
                                </span>
                                <span class="text-xs text-gray-500">Similarity: ${Math.round(group.similarity * 100)}%</span>
                            </div>
                            <div class="text-sm bg-white border border-gray-200 rounded p-2 font-mono break-all mb-2">
                                "${escapeHtml(group.value.length > 150 ? group.value.substring(0, 150) + '...' : group.value)}"
                            </div>
                            <div class="flex flex-wrap gap-2">
                                ${group.keys.map(k => `
                                    <span class="px-2 py-1 bg-purple-100 rounded text-xs font-mono">
                                        ${escapeHtml(k.namespace)}.${escapeHtml(k.key)}
                                    </span>
                                `).join('')}
                            </div>
                            ${group.suggestedKey ? `
                                <div class="mt-2 text-xs text-green-600">
                                    <i class="fas fa-lightbulb mr-1"></i>Suggested: merge into <code class="bg-green-100 px-1 rounded">${escapeHtml(group.suggestedNamespace)}.${escapeHtml(group.suggestedKey)}</code>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind checkbox listeners
        listEl.querySelectorAll('.dup-group-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    selectedDuplicates.add(id);
                } else {
                    selectedDuplicates.delete(id);
                }
                updateSelectedCount();
            });
        });
    }

    function toggleSelectAll(e) {
        const isChecked = e.target.checked;
        const filterType = document.getElementById('key-filter-type')?.value || '';

        if (filterType !== 'duplicate') {
            document.querySelectorAll('.bad-key-checkbox').forEach(checkbox => {
                checkbox.checked = isChecked;
                const id = checkbox.dataset.id;
                if (isChecked) {
                    selectedBadKeys.add(id);
                } else {
                    selectedBadKeys.delete(id);
                }
            });
        }

        if (filterType !== 'bad_chars') {
            document.querySelectorAll('.dup-group-checkbox').forEach(checkbox => {
                checkbox.checked = isChecked;
                const id = checkbox.dataset.id;
                if (isChecked) {
                    selectedDuplicates.add(id);
                } else {
                    selectedDuplicates.delete(id);
                }
            });
        }

        updateSelectedCount();
    }

    function toggleSelectAllDuplicates(e) {
        const isChecked = e.target.checked;

        document.querySelectorAll('.dup-group-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
            const id = checkbox.dataset.id;
            if (isChecked) {
                selectedDuplicates.add(id);
            } else {
                selectedDuplicates.delete(id);
            }
        });

        updateSelectedCount();
    }

    function updateSelectedCount() {
        const countEl = document.getElementById('selected-keys-count');
        const total = selectedBadKeys.size + selectedDuplicates.size;
        if (countEl) {
            countEl.textContent = `${total} selected`;
        }

        // Update button states
        const fixBadBtn = document.getElementById('fix-bad-keys-btn');
        const fixDupBtn = document.getElementById('fix-duplicates-btn');

        if (fixBadBtn) {
            fixBadBtn.disabled = selectedBadKeys.size === 0;
        }
        if (fixDupBtn) {
            fixDupBtn.disabled = selectedDuplicates.size === 0;
        }
    }

    async function fixBadKeys() {
        if (selectedBadKeys.size === 0) {
            UIUtils.showWarning('Please select keys to fix');
            return;
        }

        const fixBtn = document.getElementById('fix-bad-keys-btn');
        const loadingContainer = document.getElementById('keys-loading-container');
        const loadingText = document.getElementById('keys-loading-text');
        const applyResults = document.getElementById('keys-apply-results');
        const applyLog = document.getElementById('keys-apply-log');

        // Get agent settings
        const batchSize = parseInt(document.getElementById('batch-size-select')?.value || '10');
        const maxAgents = parseInt(document.getElementById('max-agents-select')?.value || '5');

        const keyIds = Array.from(selectedBadKeys);
        const keysToFix = analysisResults.badValues.filter(k => keyIds.includes(k.id));
        const totalBatches = Math.ceil(keysToFix.length / batchSize);
        const totalWaves = Math.ceil(totalBatches / maxAgents);

        fixBtn.disabled = true;
        fixBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Fixing...';
        loadingContainer.classList.remove('hidden');
        loadingText.innerHTML = `
            <div class="mb-2">Processing ${keysToFix.length} keys with parallel agents...</div>
            <div class="text-sm text-gray-500">
                ${totalBatches} batches × ${batchSize} keys/batch | ${maxAgents} parallel agents | ${totalWaves} wave(s)
            </div>
        `;
        applyResults.classList.remove('hidden');
        applyLog.innerHTML = `
            <div class="text-blue-600 mb-2">
                <i class="fas fa-robot mr-2"></i>Spawning ${Math.min(totalBatches, maxAgents)} parallel Claude agents...
            </div>
            <div class="grid grid-cols-${Math.min(totalBatches, maxAgents)} gap-2 mb-4" id="agent-progress">
                ${Array.from({length: Math.min(totalBatches, maxAgents)}, (_, i) => `
                    <div class="bg-blue-50 border border-blue-200 rounded p-2 text-center text-xs">
                        <i class="fas fa-spinner fa-spin text-blue-500"></i>
                        <div>Agent ${i + 1}</div>
                    </div>
                `).join('')}
            </div>
            <div class="text-gray-500 text-sm">Processing in parallel for faster results...</div>
        `;

        try {
            const response = await fetch(`${API_BASE}/api/optimize-keys/fix-bad-values`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keys: keysToFix,
                    batchSize,
                    maxAgents
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Fix failed');
            }

            loadingContainer.classList.add('hidden');

            const stats = data.stats || {};
            const totalFixed = (stats.keysRemoved || 0) + (stats.keysCleaned || 0) + (stats.keysSplit || 0);

            applyLog.innerHTML = `
                <div class="text-green-600 font-semibold mb-2">
                    <i class="fas fa-check-circle mr-2"></i>Fixes Applied Successfully!
                </div>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    <div class="bg-red-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-red-600">${stats.keysRemoved || 0}</div>
                        <div class="text-xs text-gray-600">Removed</div>
                    </div>
                    <div class="bg-blue-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-blue-600">${stats.keysCleaned || 0}</div>
                        <div class="text-xs text-gray-600">Cleaned</div>
                    </div>
                    <div class="bg-purple-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-purple-600">${stats.keysSplit || 0}</div>
                        <div class="text-xs text-gray-600">Split</div>
                    </div>
                    <div class="bg-green-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-green-600">${stats.newKeysCreated || 0}</div>
                        <div class="text-xs text-gray-600">New Keys</div>
                    </div>
                    <div class="bg-gray-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-gray-600">${stats.keysKept || 0}</div>
                        <div class="text-xs text-gray-600">Kept</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    <div class="bg-yellow-50 rounded p-2 text-center">
                        <div class="text-lg font-bold text-yellow-700">${stats.jsonFilesModified || 0}</div>
                        <div class="text-xs text-gray-600">JSON Files Modified</div>
                    </div>
                    <div class="bg-cyan-50 rounded p-2 text-center">
                        <div class="text-lg font-bold text-cyan-700">${stats.tsxFilesModified || 0}</div>
                        <div class="text-xs text-gray-600">TSX Files Modified</div>
                    </div>
                    <div class="bg-green-50 rounded p-2 text-center">
                        <div class="text-lg font-bold text-green-700">${stats.keysSynced || 0}</div>
                        <div class="text-xs text-gray-600">Keys Auto-Synced</div>
                    </div>
                    <div class="bg-indigo-50 rounded p-2 text-center">
                        <div class="text-lg font-bold text-indigo-700">${stats.localesSynced || 0}</div>
                        <div class="text-xs text-gray-600">Locales Updated</div>
                    </div>
                </div>
                ${data.appliedChanges && data.appliedChanges.length > 0 ? `
                    <div class="border-t pt-2">
                        <div class="font-semibold mb-2">Applied Changes:</div>
                        <div class="text-xs max-h-60 overflow-y-auto space-y-1">
                            ${data.appliedChanges.map(c => {
                                const icon = c.type === 'remove' ? 'fa-trash text-red-500' :
                                             c.type === 'clean' ? 'fa-broom text-blue-500' :
                                             c.type === 'split' ? 'fa-code-branch text-purple-500' : 'fa-check text-gray-500';
                                const label = c.type === 'remove' ? 'Removed' :
                                              c.type === 'clean' ? 'Cleaned' :
                                              c.type === 'split' ? 'Split' : 'Kept';
                                return `
                                <div class="bg-gray-50 p-2 rounded border-l-4 ${c.type === 'remove' ? 'border-red-400' : c.type === 'clean' ? 'border-blue-400' : c.type === 'split' ? 'border-purple-400' : 'border-gray-400'}">
                                    <div class="flex items-center gap-2">
                                        <i class="fas ${icon}"></i>
                                        <span class="font-mono text-gray-800">${escapeHtml(c.key)}</span>
                                        <span class="text-xs bg-gray-200 px-1 rounded">${label}</span>
                                    </div>
                                    ${c.newKeys ? `<div class="text-green-600 text-xs mt-1">→ ${c.newKeys.map(k => escapeHtml(k)).join(', ')}</div>` : ''}
                                    ${c.newValue ? `<div class="text-blue-600 text-xs mt-1">→ "${escapeHtml(c.newValue)}"</div>` : ''}
                                    ${c.reason ? `<div class="text-gray-500 text-xs mt-1 italic">${escapeHtml(c.reason)}</div>` : ''}
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                ` : ''}
                ${data.modifiedFiles?.tsx?.length > 0 ? `
                    <div class="border-t pt-2 mt-2">
                        <div class="font-semibold mb-1 text-xs">Modified TSX Files:</div>
                        <div class="text-xs text-gray-600 max-h-20 overflow-y-auto">
                            ${data.modifiedFiles.tsx.map(f => `<div class="truncate">• ${escapeHtml(f.replace(/.*[\/\\]frontend[\/\\]/, ''))}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="mt-4 text-sm text-gray-600">
                    <i class="fas fa-info-circle mr-1"></i>
                    ${data.message}
                </div>
            `;

            UIUtils.showSuccess(`Processed ${data.stats.processed} keys with ${data.stats.batches} parallel agents!`);

        } catch (error) {
            console.error('Fix error:', error);
            UIUtils.showError('Fix failed: ' + error.message);
            loadingContainer.classList.add('hidden');
            applyLog.innerHTML = `<div class="text-red-600"><i class="fas fa-times-circle mr-2"></i>${escapeHtml(error.message)}</div>`;
        } finally {
            fixBtn.disabled = false;
            fixBtn.innerHTML = '<i class="fas fa-robot mr-2"></i>Fix Bad Values';
        }
    }

    async function fixDuplicates() {
        if (selectedDuplicates.size === 0) {
            UIUtils.showWarning('Please select duplicate groups to merge');
            return;
        }

        const fixBtn = document.getElementById('fix-duplicates-btn');
        const loadingContainer = document.getElementById('keys-loading-container');
        const loadingText = document.getElementById('keys-loading-text');
        const applyResults = document.getElementById('keys-apply-results');
        const applyLog = document.getElementById('keys-apply-log');

        fixBtn.disabled = true;
        fixBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Merging...';
        loadingContainer.classList.remove('hidden');
        loadingText.textContent = 'Merging duplicate keys...';
        applyResults.classList.remove('hidden');
        applyLog.innerHTML = '<div class="text-gray-600"><i class="fas fa-spinner fa-spin mr-2"></i>Processing...</div>';

        try {
            const groupIds = Array.from(selectedDuplicates);
            const groupsToMerge = analysisResults.duplicateGroups.filter(g => groupIds.includes(g.id));

            const response = await fetch(`${API_BASE}/api/optimize-keys/merge-duplicates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groups: groupsToMerge })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Merge failed');
            }

            loadingContainer.classList.add('hidden');

            applyLog.innerHTML = `
                <div class="text-green-600 font-semibold mb-2">
                    <i class="fas fa-check-circle mr-2"></i>Duplicates Merged!
                </div>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    <div class="bg-purple-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-purple-600">${data.stats.groupsMerged}</div>
                        <div class="text-xs text-gray-600">Groups Merged</div>
                    </div>
                    <div class="bg-red-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-red-600">${data.stats.keysMerged}</div>
                        <div class="text-xs text-gray-600">Keys Removed</div>
                    </div>
                    <div class="bg-blue-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-blue-600">${data.stats.filesUpdated}</div>
                        <div class="text-xs text-gray-600">Files Updated</div>
                    </div>
                    <div class="bg-green-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-green-600">${data.stats.keysSynced || 0}</div>
                        <div class="text-xs text-gray-600">Keys Synced</div>
                    </div>
                    <div class="bg-indigo-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-indigo-600">${data.stats.localesSynced || 0}</div>
                        <div class="text-xs text-gray-600">Locales Synced</div>
                    </div>
                </div>
                ${data.changes && data.changes.length > 0 ? `
                    <div class="border-t pt-2">
                        <div class="font-semibold mb-1">Changes made:</div>
                        <div class="text-xs max-h-60 overflow-y-auto space-y-1">
                            ${data.changes.map(c => `<div class="bg-purple-50 p-1 rounded">${escapeHtml(c)}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
            `;

            UIUtils.showSuccess(`Merged ${data.stats.groupsMerged} duplicate groups!`);

            // Re-analyze after merge
            setTimeout(() => analyzeKeys(), 2000);

        } catch (error) {
            console.error('Merge error:', error);
            UIUtils.showError('Merge failed: ' + error.message);
            loadingContainer.classList.add('hidden');
            applyLog.innerHTML = `<div class="text-red-600"><i class="fas fa-times-circle mr-2"></i>${escapeHtml(error.message)}</div>`;
        } finally {
            fixBtn.disabled = false;
            fixBtn.innerHTML = '<i class="fas fa-compress-arrows-alt mr-2"></i>Dedup Selected';
        }
    }

    // ============ Suffix Duplicates Functions ============

    async function analyzeSuffixDuplicates() {
        const analyzeBtn = document.getElementById('analyze-suffix-btn');
        const container = document.getElementById('suffix-duplicates-container');
        const listEl = document.getElementById('suffix-duplicates-list');
        const countEl = document.getElementById('suffix-duplicates-count');
        const applyResults = document.getElementById('keys-apply-results');
        const applyLog = document.getElementById('keys-apply-log');

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';

        try {
            const response = await fetch(`${API_BASE}/api/optimize-keys/analyze-number-suffixes`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            suffixDuplicates = data.suffixDuplicates || [];
            selectedSuffixDuplicates.clear();

            container.classList.remove('hidden');
            countEl.textContent = `(${suffixDuplicates.length} keys)`;

            if (suffixDuplicates.length === 0) {
                listEl.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-check-circle text-4xl mb-3 text-green-500"></i>
                        <p class="font-semibold">No suffix duplicates found!</p>
                        <p class="text-sm">All keys with _number suffixes are unique.</p>
                    </div>
                `;
                document.getElementById('fix-suffix-btn').disabled = true;
            } else {
                renderSuffixDuplicates();
                UIUtils.showSuccess(`Found ${suffixDuplicates.length} keys with number suffix duplicates`);
            }

            // Show results in apply log
            applyResults.classList.remove('hidden');
            applyLog.innerHTML = `
                <div class="text-blue-600 font-semibold mb-2">
                    <i class="fas fa-info-circle mr-2"></i>Suffix Duplicate Analysis Complete
                </div>
                <div class="mb-2">
                    Found <span class="font-bold text-orange-600">${suffixDuplicates.length}</span> keys with _number suffix that have a matching base key.
                </div>
                ${suffixDuplicates.length > 0 ? `
                    <div class="text-sm text-gray-600">
                        Select the suffix keys you want to remove. The TSX files will be updated to use the base key instead.
                    </div>
                ` : ''}
            `;

        } catch (error) {
            console.error('Suffix analysis error:', error);
            UIUtils.showError('Analysis failed: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Find Suffix Duplicates';
        }
    }

    function renderSuffixDuplicates() {
        const listEl = document.getElementById('suffix-duplicates-list');
        if (!listEl || suffixDuplicates.length === 0) return;

        listEl.innerHTML = suffixDuplicates.map((dup, idx) => {
            const isSelected = selectedSuffixDuplicates.has(idx);
            const similarityPercent = Math.round(dup.similarity * 100);
            const isSame = dup.areSame;

            return `
                <div class="border ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'} rounded-lg p-3 transition-all">
                    <div class="flex items-start gap-3">
                        <input type="checkbox" class="suffix-dup-checkbox mt-1 h-4 w-4 text-orange-600 rounded"
                            data-idx="${idx}" ${isSelected ? 'checked' : ''}>
                        <div class="flex-grow min-w-0">
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="px-2 py-0.5 bg-gray-200 rounded text-xs font-mono">${escapeHtml(dup.namespace)}</span>
                                ${isSame ? `
                                    <span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">Exact Match</span>
                                ` : `
                                    <span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">${similarityPercent}% Similar</span>
                                `}
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div class="bg-red-50 border border-red-200 rounded p-2">
                                    <div class="text-xs text-red-600 font-semibold mb-1">
                                        <i class="fas fa-trash-alt mr-1"></i>Remove (suffix key):
                                    </div>
                                    <div class="font-mono text-sm text-red-800 break-all">${escapeHtml(dup.suffixKey)}</div>
                                    <div class="text-xs text-gray-600 mt-1 truncate" title="${escapeHtml(dup.suffixValue)}">"${escapeHtml(dup.suffixValue.length > 60 ? dup.suffixValue.substring(0, 60) + '...' : dup.suffixValue)}"</div>
                                </div>
                                <div class="bg-green-50 border border-green-200 rounded p-2">
                                    <div class="text-xs text-green-600 font-semibold mb-1">
                                        <i class="fas fa-check mr-1"></i>Keep (base key):
                                    </div>
                                    <div class="font-mono text-sm text-green-800 break-all">${escapeHtml(dup.baseKey)}</div>
                                    <div class="text-xs text-gray-600 mt-1 truncate" title="${escapeHtml(dup.baseValue)}">"${escapeHtml(dup.baseValue.length > 60 ? dup.baseValue.substring(0, 60) + '...' : dup.baseValue)}"</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind checkbox listeners
        listEl.querySelectorAll('.suffix-dup-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                if (e.target.checked) {
                    selectedSuffixDuplicates.add(idx);
                } else {
                    selectedSuffixDuplicates.delete(idx);
                }
                updateSuffixSelectedCount();
            });
        });

        updateSuffixSelectedCount();
    }

    function toggleSelectAllSuffix(e) {
        const isChecked = e.target.checked;

        document.querySelectorAll('.suffix-dup-checkbox').forEach((checkbox, idx) => {
            checkbox.checked = isChecked;
            if (isChecked) {
                selectedSuffixDuplicates.add(idx);
            } else {
                selectedSuffixDuplicates.delete(idx);
            }
        });

        updateSuffixSelectedCount();
    }

    function updateSuffixSelectedCount() {
        const countEl = document.getElementById('suffix-selected-count');
        const fixBtn = document.getElementById('fix-suffix-btn');

        if (countEl) {
            countEl.textContent = `${selectedSuffixDuplicates.size} selected`;
        }
        if (fixBtn) {
            fixBtn.disabled = selectedSuffixDuplicates.size === 0;
        }
    }

    async function fixSuffixDuplicates() {
        if (selectedSuffixDuplicates.size === 0) {
            UIUtils.showWarning('Please select suffix duplicates to fix');
            return;
        }

        const fixBtn = document.getElementById('fix-suffix-btn');
        const loadingContainer = document.getElementById('keys-loading-container');
        const loadingText = document.getElementById('keys-loading-text');
        const applyResults = document.getElementById('keys-apply-results');
        const applyLog = document.getElementById('keys-apply-log');

        const duplicatesToFix = Array.from(selectedSuffixDuplicates).map(idx => suffixDuplicates[idx]);

        fixBtn.disabled = true;
        fixBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Fixing...';
        loadingContainer.classList.remove('hidden');
        loadingText.textContent = `Removing ${duplicatesToFix.length} suffix keys and updating TSX files...`;
        applyResults.classList.remove('hidden');
        applyLog.innerHTML = '<div class="text-gray-600"><i class="fas fa-spinner fa-spin mr-2"></i>Processing...</div>';

        try {
            const response = await fetch(`${API_BASE}/api/optimize-keys/fix-number-suffixes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duplicates: duplicatesToFix })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Fix failed');
            }

            loadingContainer.classList.add('hidden');

            applyLog.innerHTML = `
                <div class="text-green-600 font-semibold mb-2">
                    <i class="fas fa-check-circle mr-2"></i>Suffix Duplicates Fixed!
                </div>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    <div class="bg-red-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-red-600">${data.stats.keysRemoved || 0}</div>
                        <div class="text-xs text-gray-600">Keys Removed</div>
                    </div>
                    <div class="bg-blue-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-blue-600">${data.stats.localesModified || 0}</div>
                        <div class="text-xs text-gray-600">Locales Modified</div>
                    </div>
                    <div class="bg-cyan-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-cyan-600">${data.stats.tsxFilesModified || 0}</div>
                        <div class="text-xs text-gray-600">TSX Updated</div>
                    </div>
                    <div class="bg-green-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-green-600">${data.stats.keysSynced || 0}</div>
                        <div class="text-xs text-gray-600">Keys Synced</div>
                    </div>
                    <div class="bg-indigo-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-indigo-600">${data.stats.localesSynced || 0}</div>
                        <div class="text-xs text-gray-600">Locales Synced</div>
                    </div>
                </div>
                ${data.appliedChanges && data.appliedChanges.length > 0 ? `
                    <div class="border-t pt-2">
                        <div class="font-semibold mb-2">Changes Applied:</div>
                        <div class="text-xs max-h-40 overflow-y-auto space-y-1">
                            ${data.appliedChanges.map(c => `
                                <div class="bg-orange-50 p-2 rounded border-l-4 border-orange-400">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-trash-alt text-red-500"></i>
                                        <span class="font-mono text-gray-800">${escapeHtml(c.suffixKey)}</span>
                                        <i class="fas fa-arrow-right text-gray-400"></i>
                                        <span class="font-mono text-green-700">${escapeHtml(c.baseKey)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${data.modifiedFiles?.tsx?.length > 0 ? `
                    <div class="border-t pt-2 mt-2">
                        <div class="font-semibold mb-1 text-xs">Modified TSX Files:</div>
                        <div class="text-xs text-gray-600 max-h-20 overflow-y-auto">
                            ${data.modifiedFiles.tsx.map(f => `<div class="truncate">• ${escapeHtml(f)}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="mt-4 text-sm text-gray-600">
                    <i class="fas fa-info-circle mr-1"></i>
                    ${data.message}
                </div>
            `;

            UIUtils.showSuccess(`Removed ${data.stats.keysRemoved} suffix keys and updated ${data.stats.tsxFilesModified} TSX files!`);

            // Refresh the suffix duplicates list
            selectedSuffixDuplicates.clear();
            setTimeout(() => analyzeSuffixDuplicates(), 1000);

        } catch (error) {
            console.error('Fix suffix error:', error);
            UIUtils.showError('Fix failed: ' + error.message);
            loadingContainer.classList.add('hidden');
            applyLog.innerHTML = `<div class="text-red-600"><i class="fas fa-times-circle mr-2"></i>${escapeHtml(error.message)}</div>`;
        } finally {
            fixBtn.disabled = false;
            fixBtn.innerHTML = '<i class="fas fa-trash-alt mr-2"></i>Remove Selected Suffixes';
        }
    }

    // ============ Number Prefix Functions ============

    async function analyzeNumberPrefixes() {
        const analyzeBtn = document.getElementById('analyze-number-prefix-btn');
        const container = document.getElementById('number-prefix-container');
        const listEl = document.getElementById('number-prefix-list');
        const countEl = document.getElementById('number-prefix-count');
        const applyResults = document.getElementById('keys-apply-results');
        const applyLog = document.getElementById('keys-apply-log');

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';

        try {
            const response = await fetch(`${API_BASE}/api/optimize-keys/analyze-number-prefixes`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            numberPrefixedKeys = data.numberPrefixedKeys || [];
            selectedNumberPrefixes.clear();

            container.classList.remove('hidden');
            countEl.textContent = `(${numberPrefixedKeys.length} keys)`;

            if (numberPrefixedKeys.length === 0) {
                listEl.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-check-circle text-4xl mb-3 text-green-500"></i>
                        <p class="font-semibold">No number-prefixed values found!</p>
                        <p class="text-sm">All translation values are properly structured.</p>
                    </div>
                `;
                document.getElementById('fix-number-prefix-btn').disabled = true;
            } else {
                renderNumberPrefixedKeys();
                UIUtils.showSuccess(`Found ${numberPrefixedKeys.length} number-prefixed keys to fix`);
            }

            // Show results in apply log
            applyResults.classList.remove('hidden');
            applyLog.innerHTML = `
                <div class="text-teal-600 font-semibold mb-2">
                    <i class="fas fa-info-circle mr-2"></i>Number Prefix Analysis Complete
                </div>
                <div class="grid grid-cols-3 gap-4 mb-4">
                    <div class="bg-teal-50 rounded p-3 text-center">
                        <div class="text-2xl font-bold text-teal-600">${data.stats.totalNumberPrefixedKeys}</div>
                        <div class="text-xs text-gray-600">Total Found</div>
                    </div>
                    <div class="bg-green-50 rounded p-3 text-center">
                        <div class="text-2xl font-bold text-green-600">${data.stats.keysWithExistingTarget}</div>
                        <div class="text-xs text-gray-600">Target Exists</div>
                    </div>
                    <div class="bg-yellow-50 rounded p-3 text-center">
                        <div class="text-2xl font-bold text-yellow-600">${data.stats.keysNeedingNewTarget}</div>
                        <div class="text-xs text-gray-600">Need New Key</div>
                    </div>
                </div>
                ${numberPrefixedKeys.length > 0 ? `
                    <div class="text-sm text-gray-600">
                        Select the keys you want to fix. Values will be split into number literals + translatable text.
                    </div>
                ` : ''}
            `;

        } catch (error) {
            console.error('Number prefix analysis error:', error);
            UIUtils.showError('Analysis failed: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Find Number Prefixes';
        }
    }

    function renderNumberPrefixedKeys() {
        const listEl = document.getElementById('number-prefix-list');
        if (!listEl || numberPrefixedKeys.length === 0) return;

        listEl.innerHTML = numberPrefixedKeys.map((item, idx) => {
            const isSelected = selectedNumberPrefixes.has(idx);

            return `
                <div class="border ${isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200'} rounded-lg p-3 transition-all">
                    <div class="flex items-start gap-3">
                        <input type="checkbox" class="number-prefix-checkbox mt-1 h-4 w-4 text-teal-600 rounded"
                            data-idx="${idx}" ${isSelected ? 'checked' : ''}>
                        <div class="flex-grow min-w-0">
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="px-2 py-0.5 bg-gray-200 rounded text-xs font-mono">${escapeHtml(item.namespace)}</span>
                                <span class="font-mono text-sm font-semibold text-gray-800 truncate">${escapeHtml(item.keyName)}</span>
                                ${item.targetExists ? `
                                    <span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">Target Exists</span>
                                ` : `
                                    <span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">New Key Needed</span>
                                `}
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div class="bg-red-50 border border-red-200 rounded p-2">
                                    <div class="text-xs text-red-600 font-semibold mb-1">
                                        <i class="fas fa-times-circle mr-1"></i>Current (remove):
                                    </div>
                                    <div class="font-mono text-sm text-red-800 break-all">${escapeHtml(item.fullKey)}</div>
                                    <div class="text-xs text-gray-600 mt-1">"${escapeHtml(item.value)}"</div>
                                </div>
                                <div class="bg-green-50 border border-green-200 rounded p-2">
                                    <div class="text-xs text-green-600 font-semibold mb-1">
                                        <i class="fas fa-magic mr-1"></i>After fix:
                                    </div>
                                    <div class="font-mono text-sm text-green-800 break-all">
                                        <span class="bg-blue-100 px-1 rounded">${escapeHtml(item.numberPart)}</span> +
                                        t('<span class="text-teal-600">${escapeHtml(item.suggestedKey)}</span>')
                                    </div>
                                    <div class="text-xs text-gray-600 mt-1">
                                        <span class="font-mono">${escapeHtml(item.codeReplacement)}</span>
                                    </div>
                                    ${item.targetExists ? `
                                        <div class="text-xs text-green-500 mt-1">
                                            <i class="fas fa-check mr-1"></i>Target key exists: "${escapeHtml(item.existingValue)}"
                                        </div>
                                    ` : `
                                        <div class="text-xs text-yellow-600 mt-1">
                                            <i class="fas fa-plus mr-1"></i>Will create: common.${escapeHtml(item.suggestedKey)} = "${escapeHtml(item.textPart)}"
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind checkbox listeners
        listEl.querySelectorAll('.number-prefix-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                if (e.target.checked) {
                    selectedNumberPrefixes.add(idx);
                } else {
                    selectedNumberPrefixes.delete(idx);
                }
                updateNumberPrefixSelectedCount();
            });
        });

        updateNumberPrefixSelectedCount();
    }

    function toggleSelectAllNumberPrefix(e) {
        const isChecked = e.target.checked;

        document.querySelectorAll('.number-prefix-checkbox').forEach((checkbox, idx) => {
            checkbox.checked = isChecked;
            if (isChecked) {
                selectedNumberPrefixes.add(idx);
            } else {
                selectedNumberPrefixes.delete(idx);
            }
        });

        updateNumberPrefixSelectedCount();
    }

    function updateNumberPrefixSelectedCount() {
        const countEl = document.getElementById('number-prefix-selected-count');
        const fixBtn = document.getElementById('fix-number-prefix-btn');

        if (countEl) {
            countEl.textContent = `${selectedNumberPrefixes.size} selected`;
        }
        if (fixBtn) {
            fixBtn.disabled = selectedNumberPrefixes.size === 0;
        }
    }

    async function fixNumberPrefixes() {
        if (selectedNumberPrefixes.size === 0) {
            UIUtils.showWarning('Please select number-prefixed keys to fix');
            return;
        }

        const fixBtn = document.getElementById('fix-number-prefix-btn');
        const loadingContainer = document.getElementById('keys-loading-container');
        const loadingText = document.getElementById('keys-loading-text');
        const applyResults = document.getElementById('keys-apply-results');
        const applyLog = document.getElementById('keys-apply-log');

        const keysToFix = Array.from(selectedNumberPrefixes).map(idx => numberPrefixedKeys[idx]);

        fixBtn.disabled = true;
        fixBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Fixing...';
        loadingContainer.classList.remove('hidden');
        loadingText.textContent = `Fixing ${keysToFix.length} number-prefixed keys...`;
        applyResults.classList.remove('hidden');
        applyLog.innerHTML = '<div class="text-gray-600"><i class="fas fa-spinner fa-spin mr-2"></i>Processing...</div>';

        try {
            const response = await fetch(`${API_BASE}/api/optimize-keys/fix-number-prefixes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keys: keysToFix })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Fix failed');
            }

            loadingContainer.classList.add('hidden');

            // Check for manual review items
            const manualReviews = data.appliedChanges?.filter(c => c.type === 'manual_review') || [];

            applyLog.innerHTML = `
                <div class="text-green-600 font-semibold mb-2">
                    <i class="fas fa-check-circle mr-2"></i>Number-Prefixed Keys Fixed!
                </div>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    <div class="bg-red-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-red-600">${data.stats.keysRemoved || 0}</div>
                        <div class="text-xs text-gray-600">Keys Removed</div>
                    </div>
                    <div class="bg-green-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-green-600">${data.stats.keysCreated || 0}</div>
                        <div class="text-xs text-gray-600">Keys Created</div>
                    </div>
                    <div class="bg-blue-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-blue-600">${data.stats.localesModified || 0}</div>
                        <div class="text-xs text-gray-600">Locales Modified</div>
                    </div>
                    <div class="bg-cyan-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-cyan-600">${data.stats.codeFilesModified || 0}</div>
                        <div class="text-xs text-gray-600">Code Files Updated</div>
                    </div>
                    <div class="bg-indigo-50 rounded p-2 text-center">
                        <div class="text-xl font-bold text-indigo-600">${data.stats.keysSynced || 0}</div>
                        <div class="text-xs text-gray-600">Keys Synced</div>
                    </div>
                </div>
                ${manualReviews.length > 0 ? `
                    <div class="border-t pt-2 mb-4">
                        <div class="font-semibold mb-2 text-yellow-700">
                            <i class="fas fa-exclamation-triangle mr-1"></i>Manual Review Required (${manualReviews.length}):
                        </div>
                        <div class="text-xs max-h-40 overflow-y-auto space-y-1">
                            ${manualReviews.map(c => `
                                <div class="bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                                    <div class="font-mono text-gray-800">${escapeHtml(c.file)}</div>
                                    <div class="text-yellow-700 mt-1">${escapeHtml(c.reason)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${data.appliedChanges && data.appliedChanges.filter(c => c.type !== 'manual_review').length > 0 ? `
                    <div class="border-t pt-2">
                        <div class="font-semibold mb-2">Changes Applied:</div>
                        <div class="text-xs max-h-40 overflow-y-auto space-y-1">
                            ${data.appliedChanges.filter(c => c.type !== 'manual_review').map(c => {
                                const icon = c.type === 'create_key' ? 'fa-plus text-green-500' :
                                             c.type === 'remove_key' ? 'fa-trash-alt text-red-500' : 'fa-check text-gray-500';
                                return `
                                <div class="bg-teal-50 p-2 rounded border-l-4 border-teal-400">
                                    <div class="flex items-center gap-2">
                                        <i class="fas ${icon}"></i>
                                        <span class="font-mono text-gray-800">${escapeHtml(c.key)}</span>
                                    </div>
                                    ${c.reason ? `<div class="text-gray-500 text-xs mt-1 italic">${escapeHtml(c.reason)}</div>` : ''}
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                ` : ''}
                ${data.modifiedFiles?.code?.length > 0 ? `
                    <div class="border-t pt-2 mt-2">
                        <div class="font-semibold mb-1 text-xs">Modified Code Files:</div>
                        <div class="text-xs text-gray-600 max-h-20 overflow-y-auto">
                            ${data.modifiedFiles.code.map(f => `<div class="truncate">• ${escapeHtml(f)}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="mt-4 text-sm text-gray-600">
                    <i class="fas fa-info-circle mr-1"></i>
                    ${data.message}
                </div>
            `;

            UIUtils.showSuccess(`Fixed ${data.stats.keysRemoved} number-prefixed keys!`);

            // Refresh the list
            selectedNumberPrefixes.clear();
            setTimeout(() => analyzeNumberPrefixes(), 1000);

        } catch (error) {
            console.error('Fix number prefix error:', error);
            UIUtils.showError('Fix failed: ' + error.message);
            loadingContainer.classList.add('hidden');
            applyLog.innerHTML = `<div class="text-red-600"><i class="fas fa-times-circle mr-2"></i>${escapeHtml(error.message)}</div>`;
        } finally {
            fixBtn.disabled = false;
            fixBtn.innerHTML = '<i class="fas fa-magic mr-2"></i>Fix Selected';
        }
    }

    // Export
    window.OptimizeKeysPage = {
        render,
        initialize
    };
})();
