// Optimize Namespaces Page
// Analyzes and optimizes translation key placement across namespaces
(function() {
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:5000`
        : '';

    let analysisResults = null;
    let selectedOptimizations = new Set();

    function render() {
        return `
            <div class="max-w-7xl mx-auto">
                <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-sitemap text-indigo-600 mr-3"></i>Optimize Namespaces
                        </h2>
                        <div class="text-sm text-gray-600">
                            Find and consolidate duplicate keys across namespaces
                        </div>
                    </div>

                    <!-- Workflow Steps -->
                    <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-6">
                        <h3 class="font-semibold text-indigo-900 mb-3">Workflow Steps:</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div class="bg-white rounded-lg p-3 border border-indigo-200">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">1</span>
                                    <strong class="text-indigo-800">Analyze</strong>
                                </div>
                                <p class="text-xs text-gray-600">Scan codebase for duplicates, broken calls, and wrong namespace usage</p>
                            </div>
                            <div class="bg-white rounded-lg p-3 border border-yellow-200">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600 text-white text-xs font-bold">2</span>
                                    <strong class="text-yellow-800">Fix Empty NS</strong>
                                </div>
                                <p class="text-xs text-gray-600">Add namespace to useTranslations() calls that are empty</p>
                            </div>
                            <div class="bg-white rounded-lg p-3 border border-red-200">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold">3</span>
                                    <strong class="text-red-800">Fix Wrong NS</strong>
                                </div>
                                <p class="text-xs text-gray-600">Fix t() calls using wrong namespace (key exists in another NS)</p>
                            </div>
                            <div class="bg-white rounded-lg p-3 border border-green-200">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold">4</span>
                                    <strong class="text-green-800">Consolidate</strong>
                                </div>
                                <p class="text-xs text-gray-600">Remove duplicate values and sync across namespaces</p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons - Responsive Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        <button id="analyze-btn" class="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md">
                            <i class="fas fa-search-plus"></i>
                            <span>Analyze</span>
                        </button>
                        <button id="fix-missing-ns-btn" class="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md">
                            <i class="fas fa-tag"></i>
                            <span>Fix Empty NS</span>
                        </button>
                        <button id="fix-broken-btn" disabled class="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md">
                            <i class="fas fa-wrench"></i>
                            <span>Fix Wrong NS</span>
                        </button>
                        <button id="optimize-btn" disabled class="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md">
                            <i class="fas fa-compress-arrows-alt"></i>
                            <span>Consolidate</span>
                        </button>
                    </div>

                    <!-- Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div>
                            <input type="text" id="filter-input" placeholder="Filter by value or key..."
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                        </div>
                        <div>
                            <select id="filter-namespace" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                <option value="">All Namespaces</option>
                            </select>
                        </div>
                        <div>
                            <select id="filter-action" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                <option value="">All Actions</option>
                                <option value="move_to_common">Move to Common</option>
                                <option value="move_to_parent">Move to Parent</option>
                                <option value="deduplicate">Deduplicate Only</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-4">
                            <label class="flex items-center cursor-pointer">
                                <input type="checkbox" id="select-all" class="mr-2 h-4 w-4 text-indigo-600 rounded">
                                <span class="text-sm">Select All</span>
                            </label>
                            <span id="selected-count" class="text-sm text-gray-500">0 selected</span>
                        </div>
                    </div>
                </div>

                <!-- Stats Summary -->
                <div id="stats-container" class="hidden">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div class="bg-white rounded-lg shadow p-4 text-center">
                            <div class="text-3xl font-bold text-blue-600" id="stat-namespaces">0</div>
                            <div class="text-sm text-gray-600">Namespaces</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4 text-center">
                            <div class="text-3xl font-bold text-green-600" id="stat-total-keys">0</div>
                            <div class="text-sm text-gray-600">Total Keys</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4 text-center">
                            <div class="text-3xl font-bold text-orange-600" id="stat-duplicates">0</div>
                            <div class="text-sm text-gray-600">Duplicate Values</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4 text-center">
                            <div class="text-3xl font-bold text-purple-600" id="stat-can-optimize">0</div>
                            <div class="text-sm text-gray-600">Can Optimize</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-white rounded-lg shadow p-4 text-center border-2 border-red-200">
                            <div class="text-3xl font-bold text-red-600" id="stat-broken-calls">0</div>
                            <div class="text-sm text-gray-600">Broken t() Calls</div>
                            <div id="stat-breakdown" class="text-xs text-gray-500 mt-1 hidden">
                                <span class="text-red-500" id="stat-wrong-ns">0</span> wrong NS •
                                <span class="text-blue-500" id="stat-missing-key">0</span> missing •
                                <span class="text-orange-500" id="stat-undeclared">0</span> undeclared
                            </div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4 text-center border-2 border-red-200">
                            <div class="text-3xl font-bold text-red-600" id="stat-files-issues">0</div>
                            <div class="text-sm text-gray-600">Files with Issues</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4 text-center">
                            <div class="text-3xl font-bold text-gray-600" id="stat-savings">0</div>
                            <div class="text-sm text-gray-600">Keys Saveable</div>
                        </div>
                    </div>
                </div>

                <!-- Loading -->
                <div id="loading-container" class="hidden text-center py-12">
                    <i class="fas fa-spinner fa-spin text-5xl text-indigo-500 mb-4"></i>
                    <p class="text-gray-600" id="loading-text">Analyzing namespaces...</p>
                </div>

                <!-- Results -->
                <div id="results-container" class="hidden">
                    <!-- Broken Calls Section -->
                    <div id="broken-calls-container" class="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-red-200 hidden">
                        <h3 class="text-lg font-bold text-red-800 mb-4">
                            <i class="fas fa-exclamation-triangle mr-2 text-red-600"></i>Broken Translation Calls
                            <span id="broken-calls-count" class="ml-2 text-sm font-normal text-red-500">(0 issues)</span>
                        </h3>
                        <div class="text-sm mb-3 space-y-1">
                            <div class="text-red-700"><i class="fas fa-exchange-alt mr-1"></i><strong>Wrong namespace:</strong> Key exists but in a different namespace - will change the variable name</div>
                            <div class="text-blue-700"><i class="fas fa-plus-circle mr-1"></i><strong>Key not found:</strong> Key doesn't exist anywhere - will add it to the JSON files</div>
                        </div>
                        <div id="broken-calls-list" class="space-y-2 max-h-[300px] overflow-y-auto">
                            <!-- Broken call items will be rendered here -->
                        </div>
                    </div>

                    <!-- Optimizations List -->
                    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-list-check mr-2 text-green-600"></i>Optimization Opportunities
                            <span id="optimization-count" class="ml-2 text-sm font-normal text-gray-500">(0 items)</span>
                        </h3>
                        <div id="optimizations-list" class="space-y-3 max-h-[600px] overflow-y-auto">
                            <!-- Optimization items will be rendered here -->
                        </div>
                    </div>

                    <!-- Namespace Distribution -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-chart-pie mr-2 text-indigo-600"></i>Namespace Distribution
                        </h3>
                        <div id="namespace-chart" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <!-- Namespace cards will be rendered here -->
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div id="empty-container" class="bg-white rounded-lg shadow-lg p-12 text-center">
                    <i class="fas fa-sitemap text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">Ready to Optimize</h3>
                    <p class="text-gray-600">Click "Analyze Namespaces" to find duplicate keys and optimization opportunities.</p>
                </div>

                <!-- Apply Results -->
                <div id="apply-results" class="hidden mt-6">
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-clipboard-check mr-2 text-green-600"></i>Optimization Results
                        </h3>
                        <div id="apply-log" class="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                            <!-- Results will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function initialize() {
        // Bind event listeners
        document.getElementById('analyze-btn')?.addEventListener('click', analyzeNamespaces);
        document.getElementById('optimize-btn')?.addEventListener('click', applyOptimizationsAndFixSources);
        document.getElementById('fix-broken-btn')?.addEventListener('click', fixBrokenCallsOnly);
        document.getElementById('fix-missing-ns-btn')?.addEventListener('click', fixMissingNamespaces);
        document.getElementById('select-all')?.addEventListener('change', toggleSelectAll);
        document.getElementById('filter-input')?.addEventListener('input', debounce(renderOptimizations, 300));
        document.getElementById('filter-namespace')?.addEventListener('change', renderOptimizations);
        document.getElementById('filter-action')?.addEventListener('change', renderOptimizations);
    }

    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function analyzeNamespaces() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const loadingContainer = document.getElementById('loading-container');
        const emptyContainer = document.getElementById('empty-container');
        const resultsContainer = document.getElementById('results-container');
        const statsContainer = document.getElementById('stats-container');

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
        emptyContainer.classList.add('hidden');
        loadingContainer.classList.remove('hidden');
        resultsContainer.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE}/api/tools/analyze-namespaces`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            analysisResults = data;
            selectedOptimizations.clear();

            // Update stats
            document.getElementById('stat-namespaces').textContent = data.stats.namespaceCount;
            document.getElementById('stat-total-keys').textContent = data.stats.totalKeys;
            document.getElementById('stat-duplicates').textContent = data.stats.duplicateValueCount;
            document.getElementById('stat-can-optimize').textContent = data.optimizations.length;
            document.getElementById('stat-savings').textContent = data.stats.potentialSavings;
            document.getElementById('stat-broken-calls').textContent = data.stats.brokenCallsCount || 0;
            document.getElementById('stat-files-issues').textContent = data.stats.filesWithIssues || 0;

            // Show issue type breakdown if there are broken calls
            const breakdownEl = document.getElementById('stat-breakdown');
            if (data.stats.issuesByType && data.stats.brokenCallsCount > 0) {
                document.getElementById('stat-wrong-ns').textContent = data.stats.issuesByType.wrong_namespace || 0;
                document.getElementById('stat-missing-key').textContent = data.stats.issuesByType.missing_key || 0;
                document.getElementById('stat-undeclared').textContent = data.stats.issuesByType.undeclared_variable || 0;
                breakdownEl.classList.remove('hidden');
            } else {
                breakdownEl.classList.add('hidden');
            }

            // Populate namespace filter
            const namespaceSelect = document.getElementById('filter-namespace');
            namespaceSelect.innerHTML = '<option value="">All Namespaces</option>';
            data.namespaces.forEach(ns => {
                namespaceSelect.innerHTML += `<option value="${escapeHtml(ns.name)}">${escapeHtml(ns.name)} (${ns.keyCount})</option>`;
            });

            // Render namespace distribution
            renderNamespaceChart(data.namespaces);

            // Render broken calls
            renderBrokenCalls(data.brokenCalls || []);

            // Render optimizations
            renderOptimizations();

            statsContainer.classList.remove('hidden');
            resultsContainer.classList.remove('hidden');
            loadingContainer.classList.add('hidden');

            document.getElementById('optimize-btn').disabled = true;
            // Enable fix broken button only if there are wrong_namespace issues (fixable)
            const wrongNsCount = data.stats.issuesByType?.wrong_namespace || 0;
            const fixBrokenBtn = document.getElementById('fix-broken-btn');
            fixBrokenBtn.disabled = wrongNsCount === 0;
            // Update button text to show count
            if (wrongNsCount > 0) {
                fixBrokenBtn.innerHTML = `<i class="fas fa-wrench"></i><span>Fix Wrong NS (${wrongNsCount})</span>`;
            } else {
                fixBrokenBtn.innerHTML = '<i class="fas fa-wrench"></i><span>Fix Wrong NS</span>';
            }

            const brokenMsg = data.stats.brokenCallsCount > 0
                ? `, ${data.stats.brokenCallsCount} broken t() calls in ${data.stats.filesWithIssues} files`
                : '';
            UIUtils.showSuccess(`Found ${data.optimizations.length} optimization opportunities${brokenMsg}`);

        } catch (error) {
            console.error('Analysis error:', error);
            UIUtils.showError('Analysis failed: ' + error.message);
            loadingContainer.classList.add('hidden');
            emptyContainer.classList.remove('hidden');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search-plus"></i><span>Analyze</span>';
        }
    }

    function renderNamespaceChart(namespaces) {
        const container = document.getElementById('namespace-chart');
        if (!container) return;

        const maxKeys = Math.max(...namespaces.map(ns => ns.keyCount));

        container.innerHTML = namespaces.map(ns => {
            const percentage = Math.round((ns.keyCount / maxKeys) * 100);
            const color = getNamespaceColor(ns.name);

            return `
                <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div class="font-semibold text-gray-800 text-sm truncate" title="${escapeHtml(ns.name)}">${escapeHtml(ns.name)}</div>
                    <div class="text-2xl font-bold ${color}">${ns.keyCount}</div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div class="${color.replace('text-', 'bg-')} h-2 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">${ns.duplicates} duplicates</div>
                </div>
            `;
        }).join('');
    }

    function getNamespaceColor(namespace) {
        if (namespace === 'common') return 'text-green-600';
        if (namespace.startsWith('ext_')) return 'text-blue-600';
        if (namespace.startsWith('dashboard_')) return 'text-purple-600';
        if (namespace.startsWith('blog_')) return 'text-orange-600';
        return 'text-gray-600';
    }

    function renderBrokenCalls(brokenCalls) {
        const container = document.getElementById('broken-calls-container');
        const listEl = document.getElementById('broken-calls-list');
        const countEl = document.getElementById('broken-calls-count');

        if (!container || !listEl) return;

        if (!brokenCalls || brokenCalls.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        countEl.textContent = `(${brokenCalls.length} issues)`;

        // Group by file
        const byFile = {};
        for (const call of brokenCalls) {
            if (!byFile[call.file]) byFile[call.file] = [];
            byFile[call.file].push(call);
        }

        listEl.innerHTML = Object.entries(byFile).map(([file, calls]) => {
            const fileName = file.split('/').pop();
            return `
                <div class="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div class="font-semibold text-red-800 text-sm truncate mb-2" title="${escapeHtml(file)}">
                        <i class="fas fa-file-code mr-1"></i>${escapeHtml(fileName)}
                        <span class="text-red-500 font-normal ml-1">(${calls.length} issues)</span>
                    </div>
                    <div class="text-xs text-gray-600 truncate mb-2">${escapeHtml(file)}</div>
                    <div class="space-y-1">
                        ${calls.slice(0, 5).map(call => {
                            if (call.type === 'wrong_namespace') {
                                return `
                                    <div class="text-xs bg-white px-2 py-1 rounded border border-red-100">
                                        <span class="text-red-600">${escapeHtml(call.varName)}("${escapeHtml(call.key)}")</span>
                                        <span class="text-gray-500"> → key in </span>
                                        <span class="text-green-600">${escapeHtml(call.correctNamespace)}</span>
                                        <span class="text-gray-500"> not </span>
                                        <span class="text-red-600">${escapeHtml(call.currentNamespace)}</span>
                                    </div>
                                `;
                            } else if (call.type === 'missing_key') {
                                return `
                                    <div class="text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                        <span class="text-blue-600">${escapeHtml(call.varName)}("${escapeHtml(call.key)}")</span>
                                        <span class="text-blue-500"> → will be added to JSON</span>
                                    </div>
                                `;
                            } else if (call.type === 'undeclared_variable') {
                                return `
                                    <div class="text-xs bg-white px-2 py-1 rounded border border-orange-100">
                                        <span class="text-orange-600">${escapeHtml(call.varName)}("${escapeHtml(call.key)}")</span>
                                        <span class="text-gray-500"> → variable not declared</span>
                                    </div>
                                `;
                            }
                            return '';
                        }).join('')}
                        ${calls.length > 5 ? `<div class="text-xs text-gray-500">...and ${calls.length - 5} more</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderOptimizations() {
        const container = document.getElementById('optimizations-list');
        const countEl = document.getElementById('optimization-count');
        if (!container || !analysisResults) return;

        const filterText = document.getElementById('filter-input')?.value.toLowerCase() || '';
        const filterNamespace = document.getElementById('filter-namespace')?.value || '';
        const filterAction = document.getElementById('filter-action')?.value || '';

        let filtered = analysisResults.optimizations.filter(opt => {
            // Text filter
            if (filterText) {
                const matchValue = opt.value.toLowerCase().includes(filterText);
                const matchKey = opt.locations.some(l => l.key.toLowerCase().includes(filterText));
                if (!matchValue && !matchKey) return false;
            }

            // Namespace filter
            if (filterNamespace) {
                if (!opt.locations.some(l => l.namespace === filterNamespace)) return false;
            }

            // Action filter
            if (filterAction && opt.suggestedAction !== filterAction) return false;

            return true;
        });

        countEl.textContent = `(${filtered.length} items)`;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-check-circle text-3xl mb-2 text-green-500"></i>
                    <p>No optimization opportunities match your filters.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map((opt, index) => {
            const isSelected = selectedOptimizations.has(opt.id);
            const actionBadge = getActionBadge(opt.suggestedAction);

            return `
                <div class="border ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'} rounded-lg p-4 transition-all">
                    <div class="flex items-start gap-4">
                        <div class="flex-shrink-0 pt-1">
                            <input type="checkbox" class="opt-checkbox h-5 w-5 text-indigo-600 rounded"
                                data-id="${escapeHtml(opt.id)}" ${isSelected ? 'checked' : ''}>
                        </div>
                        <div class="flex-grow">
                            <div class="flex items-center gap-2 mb-2">
                                ${actionBadge}
                                <span class="text-sm text-gray-500">${opt.locations.length} occurrences</span>
                            </div>
                            <div class="font-mono text-sm bg-gray-100 p-2 rounded mb-2 break-all">
                                "${escapeHtml(opt.value.length > 100 ? opt.value.substring(0, 100) + '...' : opt.value)}"
                            </div>
                            <div class="text-sm">
                                <span class="font-semibold text-gray-600">Current locations:</span>
                                <div class="flex flex-wrap gap-2 mt-1">
                                    ${opt.locations.map(loc => `
                                        <span class="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                                            ${escapeHtml(loc.namespace)}.${escapeHtml(loc.key)}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="text-sm mt-2">
                                <span class="font-semibold text-green-600">Suggested:</span>
                                <span class="font-mono text-green-700">${escapeHtml(opt.targetNamespace)}.${escapeHtml(opt.targetKey)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind checkbox listeners
        container.querySelectorAll('.opt-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    selectedOptimizations.add(id);
                } else {
                    selectedOptimizations.delete(id);
                }
                updateSelectedCount();
            });
        });

        updateSelectedCount();
    }

    function getActionBadge(action) {
        switch (action) {
            case 'move_to_common':
                return '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold"><i class="fas fa-arrow-right mr-1"></i>Move to Common</span>';
            case 'move_to_parent':
                return '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold"><i class="fas fa-level-up-alt mr-1"></i>Move to Parent</span>';
            case 'deduplicate':
                return '<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold"><i class="fas fa-compress mr-1"></i>Deduplicate</span>';
            default:
                return '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">Unknown</span>';
        }
    }

    function toggleSelectAll(e) {
        const isChecked = e.target.checked;
        const checkboxes = document.querySelectorAll('.opt-checkbox');

        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            const id = checkbox.dataset.id;
            if (isChecked) {
                selectedOptimizations.add(id);
            } else {
                selectedOptimizations.delete(id);
            }
        });

        updateSelectedCount();
    }

    function updateSelectedCount() {
        const countEl = document.getElementById('selected-count');
        const optimizeBtn = document.getElementById('optimize-btn');

        if (countEl) {
            countEl.textContent = `${selectedOptimizations.size} selected`;
        }

        if (optimizeBtn) {
            optimizeBtn.disabled = selectedOptimizations.size === 0;
        }
    }

    async function fixBrokenCallsOnly() {
        const fixBtn = document.getElementById('fix-broken-btn');
        const loadingContainer = document.getElementById('loading-container');
        const loadingText = document.getElementById('loading-text');
        const applyResults = document.getElementById('apply-results');
        const applyLog = document.getElementById('apply-log');

        fixBtn.disabled = true;
        fixBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Fixing...';
        loadingContainer.classList.remove('hidden');
        loadingText.textContent = 'Fixing wrong namespace t() calls in source files...';
        applyResults.classList.remove('hidden');
        applyLog.innerHTML = '';

        try {
            const fixResponse = await fetch(`${API_BASE}/api/tools/fix-namespace-prefixes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const fixData = await fixResponse.json();

            if (!fixData.success) {
                throw new Error(fixData.error || 'Fix failed');
            }

            loadingContainer.classList.add('hidden');

            applyLog.innerHTML = `
                <div class="text-green-600 font-semibold mb-2">
                    <i class="fas fa-check-circle mr-2"></i>Namespace Prefixes Fixed!
                </div>
                <div class="mb-4">
                    <div>Files fixed: <span class="font-semibold">${fixData.fixedFiles}</span></div>
                    <div>Total t() calls fixed: <span class="font-semibold">${fixData.totalFixedCalls}</span></div>
                </div>
                ${fixData.updatedFiles && fixData.updatedFiles.length > 0 ? `
                    <div class="border-t pt-2">
                        <div class="font-semibold mb-1">Fixed files:</div>
                        <div class="text-xs max-h-60 overflow-y-auto">
                            ${fixData.updatedFiles.map(f => `<div class="truncate py-0.5">${escapeHtml(f)}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${fixData.errors && fixData.errors.length > 0 ? `
                    <div class="border-t pt-2 mt-2 bg-red-50 p-3 rounded">
                        <div class="text-red-700 text-sm font-semibold mb-1">
                            <i class="fas fa-exclamation-triangle mr-1"></i>Errors (${fixData.errors.length})
                        </div>
                        <div class="text-red-600 text-xs max-h-40 overflow-y-auto">
                            ${fixData.errors.map(e => `<div class="truncate py-0.5">${escapeHtml(e.file)}: ${escapeHtml(e.error)}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${fixData.fixedFiles === 0 && (!fixData.errors || fixData.errors.length === 0) ? '<div class="text-green-600 text-sm"><i class="fas fa-check mr-1"></i>All t() calls are already correct!</div>' : ''}
            `;

            if (fixData.fixedFiles > 0) {
                UIUtils.showSuccess(`Fixed ${fixData.totalFixedCalls} t() calls with namespace prefixes in ${fixData.fixedFiles} files!`);
            } else {
                UIUtils.showSuccess('All t() calls are already correct!');
            }

            // Re-analyze to show updated state
            setTimeout(() => analyzeNamespaces(), 1500);

        } catch (error) {
            console.error('Fix error:', error);
            UIUtils.showError('Fix failed: ' + error.message);
            loadingContainer.classList.add('hidden');
        } finally {
            fixBtn.disabled = false;
            fixBtn.innerHTML = '<i class="fas fa-wrench"></i><span>Fix Wrong NS</span>';
        }
    }

    async function fixMissingNamespaces() {
        const fixBtn = document.getElementById('fix-missing-ns-btn');
        const loadingContainer = document.getElementById('loading-container');
        const loadingText = document.getElementById('loading-text');
        const applyResults = document.getElementById('apply-results');
        const applyLog = document.getElementById('apply-log');

        fixBtn.disabled = true;
        fixBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Scanning...';
        loadingContainer.classList.remove('hidden');
        loadingText.textContent = 'Scanning for useTranslations() calls without namespace...';
        applyResults.classList.remove('hidden');
        applyLog.innerHTML = '';

        try {
            // Step 1: Scan for issues
            const scanResponse = await fetch(`${API_BASE}/api/orphaned/scan-missing-namespaces`);
            const scanData = await scanResponse.json();

            if (scanData.total === 0) {
                loadingContainer.classList.add('hidden');
                applyLog.innerHTML = `
                    <div class="text-green-600 font-semibold">
                        <i class="fas fa-check-circle mr-2"></i>No missing namespace issues found!
                    </div>
                    <div class="text-sm text-gray-600 mt-2">
                        All useTranslations() calls already have proper namespace parameters.
                    </div>
                `;
                UIUtils.showSuccess('No missing namespace issues found!');
                fixBtn.disabled = false;
                fixBtn.innerHTML = '<i class="fas fa-tag"></i><span>Fix Empty NS</span>';
                return;
            }

            // Show found issues and ask for confirmation
            applyLog.innerHTML = `
                <div class="text-yellow-600 font-semibold mb-4">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Found ${scanData.total} useTranslations() calls without namespace
                </div>
                <div class="space-y-2 max-h-60 overflow-y-auto mb-4">
                    ${scanData.issues.map(issue => `
                        <div class="bg-yellow-50 rounded p-2 text-sm border border-yellow-200">
                            <div class="font-semibold text-yellow-800">${escapeHtml(issue.file)}</div>
                            <div class="text-xs text-gray-600">Line ${issue.lineNumber}: const ${issue.varName} = useTranslations()</div>
                            <div class="text-xs text-green-600">Will add namespace: "${escapeHtml(issue.suggestedNamespace)}"</div>
                            ${issue.usedKeys.length > 0 ? `
                                <div class="text-xs text-gray-500 mt-1">Uses keys: ${issue.usedKeys.slice(0, 5).map(k => `"${k}"`).join(', ')}${issue.totalKeys > 5 ? ` +${issue.totalKeys - 5} more` : ''}</div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="flex gap-4">
                    <button id="confirm-fix-ns" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold">
                        <i class="fas fa-check mr-2"></i>Fix All ${scanData.total} Issues
                    </button>
                    <button id="cancel-fix-ns" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded font-semibold">
                        <i class="fas fa-times mr-2"></i>Cancel
                    </button>
                </div>
            `;

            loadingContainer.classList.add('hidden');
            fixBtn.disabled = false;
            fixBtn.innerHTML = '<i class="fas fa-tag"></i><span>Fix Empty NS</span>';

            // Handle confirm button
            document.getElementById('confirm-fix-ns')?.addEventListener('click', async () => {
                const confirmBtn = document.getElementById('confirm-fix-ns');
                const cancelBtn = document.getElementById('cancel-fix-ns');
                confirmBtn.disabled = true;
                cancelBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Fixing...';

                try {
                    const fixResponse = await fetch(`${API_BASE}/api/orphaned/fix-missing-namespaces`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    });

                    const fixData = await fixResponse.json();

                    if (!fixData.success) {
                        throw new Error(fixData.error || 'Fix failed');
                    }

                    applyLog.innerHTML = `
                        <div class="text-green-600 font-semibold mb-2">
                            <i class="fas fa-check-circle mr-2"></i>${fixData.message}
                        </div>
                        ${fixData.results.fixed.length > 0 ? `
                            <div class="space-y-1 max-h-60 overflow-y-auto">
                                ${fixData.results.fixed.map(f => `
                                    <div class="text-sm bg-green-50 rounded p-2 border border-green-200">
                                        <span class="font-semibold">${escapeHtml(f.file)}</span>
                                        <span class="text-green-600 ml-2">→ "${escapeHtml(f.namespace)}"</span>
                                        <span class="text-gray-500 text-xs ml-2">(${f.count} fixed)</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${fixData.results.errors.length > 0 ? `
                            <div class="mt-4 text-red-600 font-semibold">Errors:</div>
                            <div class="space-y-1">
                                ${fixData.results.errors.map(e => `
                                    <div class="text-sm text-red-500">${escapeHtml(e.file)}: ${escapeHtml(e.error)}</div>
                                `).join('')}
                            </div>
                        ` : ''}
                    `;

                    UIUtils.showSuccess(fixData.message);

                    // Re-analyze after fix
                    setTimeout(() => analyzeNamespaces(), 1500);

                } catch (error) {
                    console.error('Fix error:', error);
                    UIUtils.showError('Fix failed: ' + error.message);
                }
            });

            // Handle cancel button
            document.getElementById('cancel-fix-ns')?.addEventListener('click', () => {
                applyLog.innerHTML = '<div class="text-gray-500">Operation cancelled.</div>';
            });

        } catch (error) {
            console.error('Scan error:', error);
            UIUtils.showError('Scan failed: ' + error.message);
            loadingContainer.classList.add('hidden');
            fixBtn.disabled = false;
            fixBtn.innerHTML = '<i class="fas fa-tag"></i><span>Fix Empty NS</span>';
        }
    }

    async function applyOptimizationsAndFixSources() {
        if (selectedOptimizations.size === 0) {
            UIUtils.showWarning('Please select at least one optimization to apply');
            return;
        }

        const optimizeBtn = document.getElementById('optimize-btn');
        const loadingContainer = document.getElementById('loading-container');
        const loadingText = document.getElementById('loading-text');
        const applyResults = document.getElementById('apply-results');
        const applyLog = document.getElementById('apply-log');

        optimizeBtn.disabled = true;
        optimizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Consolidating...';
        loadingContainer.classList.remove('hidden');
        loadingText.textContent = 'Consolidating translations and updating source code...';
        applyResults.classList.remove('hidden');
        applyLog.innerHTML = '';

        try {
            const optimizationIds = Array.from(selectedOptimizations);

            // Apply namespace optimizations (now also updates source code)
            const optimizeResponse = await fetch(`${API_BASE}/api/tools/apply-namespace-optimizations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ optimizationIds })
            });

            const optimizeData = await optimizeResponse.json();

            if (!optimizeData.success) {
                throw new Error(optimizeData.error || 'Optimization failed');
            }

            loadingContainer.classList.add('hidden');

            // Show optimization results (now includes source code updates)
            const stats = optimizeData.stats;
            const hasSourceUpdates = stats.sourceFilesUpdated > 0;

            applyLog.innerHTML = `
                <div class="text-green-600 font-semibold mb-2">
                    <i class="fas fa-check-circle mr-2"></i>Consolidation Complete!
                </div>
                <div class="mb-4">
                    <div class="font-semibold text-gray-700 mb-2">JSON Files:</div>
                    <div>Keys moved/consolidated: <span class="font-semibold">${stats.keysMoved}</span></div>
                    <div>Keys deleted (duplicates): <span class="font-semibold">${stats.keysDeleted}</span></div>
                    <div>Locale files updated: <span class="font-semibold">${stats.localesUpdated}</span></div>
                </div>
                ${hasSourceUpdates ? `
                <div class="border-t pt-4 mt-4 mb-4">
                    <div class="font-semibold text-blue-700 mb-2"><i class="fas fa-code mr-1"></i>Source Code Updates:</div>
                    <div>Source files updated: <span class="font-semibold text-blue-600">${stats.sourceFilesUpdated}</span></div>
                    <div>Translation calls fixed: <span class="font-semibold text-blue-600">${stats.sourceCallsFixed}</span></div>
                </div>
                ` : ''}
                <div class="border-t pt-2 mt-2 mb-4">
                    <div class="font-semibold mb-1">Changes:</div>
                    <div class="max-h-60 overflow-y-auto">
                        ${optimizeData.changes.slice(0, 100).map(c => {
                            const isSourceUpdate = c.startsWith('Updated ');
                            const icon = isSourceUpdate ? 'fa-code text-blue-500' : 'fa-file-alt text-green-500';
                            return `<div class="text-xs"><i class="fas ${icon} mr-1"></i>${escapeHtml(c)}</div>`;
                        }).join('')}
                        ${optimizeData.changes.length > 100 ? `<div class="text-xs text-gray-500">...and ${optimizeData.changes.length - 100} more</div>` : ''}
                    </div>
                </div>
                <div class="border-t pt-4 mt-4">
                    <div class="text-purple-600 font-semibold">
                        <i class="fas fa-check-double mr-2"></i>All Done!
                    </div>
                    <div class="text-sm text-gray-600 mt-1">
                        Consolidated ${stats.keysMoved} keys${hasSourceUpdates ? ` and updated ${stats.sourceFilesUpdated} source files with ${stats.sourceCallsFixed} translation calls` : ''}.
                    </div>
                </div>
            `;

            UIUtils.showSuccess(`Consolidated ${stats.keysMoved} keys${hasSourceUpdates ? ` and updated ${stats.sourceFilesUpdated} source files` : ''}!`);

            // Re-analyze to show updated state
            setTimeout(() => analyzeNamespaces(), 1500);

        } catch (error) {
            console.error('Optimization error:', error);
            UIUtils.showError('Operation failed: ' + error.message);
            loadingContainer.classList.add('hidden');
        } finally {
            optimizeBtn.disabled = false;
            optimizeBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i><span>Consolidate</span>';
        }
    }

    // Export
    window.OptimizeNamespacesPage = {
        render,
        initialize
    };
})();
