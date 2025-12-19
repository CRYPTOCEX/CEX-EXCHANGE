// Extract Text to Translations Page
(function() {
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:5000`
        : '';

    let allDirectories = [];
    let allFiles = [];
    let scanResults = null;

    function render() {
        return `
            <div class="max-w-6xl mx-auto">
                <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-magic text-green-600 mr-3"></i>Extract Text to Translations
                        </h2>
                    </div>
                    <p class="text-gray-600 mb-6">
                        Automatically finds hardcoded text in TSX files and converts them to translatable
                        <code class="bg-gray-100 px-2 py-1 rounded">t("key")</code> calls.
                        Adds the <code class="bg-gray-100 px-2 py-1 rounded">useTranslations</code> import
                        and generates translation keys in all locale files.
                    </p>

                    <!-- Configuration -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">File Type</label>
                            <select id="extract-file-type" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                <option value="all" selected>All TSX files</option>
                                <option value="columns-analytics">columns.tsx & analytics.ts</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">File Limit</label>
                            <select id="extract-file-limit" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                                <option value="" selected>No limit (all files)</option>
                                <option value="5">5 files</option>
                                <option value="10">10 files</option>
                                <option value="25">25 files</option>
                                <option value="50">50 files</option>
                                <option value="100">100 files</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Actions</label>
                            <button id="refresh-dirs-btn" class="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                <i class="fas fa-sync-alt mr-2"></i>Refresh Directories
                            </button>
                        </div>
                    </div>

                    <!-- Selection Mode -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Selection Mode</label>
                        <select id="selection-mode" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                            <option value="directory" selected>Select Directory</option>
                            <option value="file">Select Individual File</option>
                        </select>
                    </div>

                    <!-- Directory Selection -->
                    <div id="directory-selection" class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Select Directory</label>
                        <input type="text" id="directory-filter" placeholder="Filter directories..."
                            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-2">
                        <select id="directory-select" size="8" class="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm">
                            <option value="">Loading directories...</option>
                        </select>
                    </div>

                    <!-- File Selection -->
                    <div id="file-selection" class="mb-6 hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Select File</label>
                        <input type="text" id="file-filter" placeholder="Filter files (type path or filename)..."
                            class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-2">
                        <select id="file-select" size="10" class="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm">
                            <option value="">Click "Refresh Directories" to load files...</option>
                        </select>
                        <p class="text-xs text-gray-500 mt-2">
                            <i class="fas fa-info-circle mr-1"></i>Showing all .tsx files in frontend/app and frontend/components
                        </p>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-4">
                        <button id="analyze-btn" class="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all">
                            <i class="fas fa-search mr-2"></i>Analyze Files
                        </button>
                        <button id="apply-btn" class="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            <i class="fas fa-check mr-2"></i>Apply Translations
                        </button>
                    </div>
                </div>

                <!-- Analysis Results -->
                <div id="analysis-results" class="hidden">
                    <!-- Stats Summary -->
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-blue-600" id="stat-files">0</div>
                            <div class="text-sm text-gray-600">Files to Process</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-green-600" id="stat-translations">0</div>
                            <div class="text-sm text-gray-600">Translations Found</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-purple-600" id="stat-new-keys">0</div>
                            <div class="text-sm text-gray-600">New Keys</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-cyan-600" id="stat-reused">0</div>
                            <div class="text-sm text-gray-600">Reused from Shared</div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-4">
                            <div class="text-3xl font-bold text-orange-600" id="stat-existing">0</div>
                            <div class="text-sm text-gray-600">Already Exist</div>
                        </div>
                    </div>

                    <!-- Namespace Summary -->
                    <div id="namespace-summary" class="bg-white rounded-lg shadow-lg p-6 mb-6 hidden">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-sitemap mr-2 text-purple-600"></i>Namespace Distribution
                        </h3>
                        <div id="namespace-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <!-- Namespaces will be rendered here -->
                        </div>
                    </div>

                    <!-- File List -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-file-code mr-2"></i>Files to be Modified
                        </h3>
                        <div id="files-list" class="space-y-4">
                            <!-- Files will be rendered here -->
                        </div>
                    </div>
                </div>

                <!-- Apply Results -->
                <div id="apply-results" class="hidden">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div class="flex items-center mb-4">
                            <i class="fas fa-check-circle text-green-600 text-3xl mr-4"></i>
                            <div>
                                <h3 class="text-xl font-bold text-green-800">Extraction Complete!</h3>
                                <p class="text-green-700" id="apply-summary"></p>
                            </div>
                        </div>
                        <div id="apply-details" class="mt-4"></div>
                    </div>
                </div>

                <!-- Warning -->
                <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div class="flex items-start">
                        <i class="fas fa-exclamation-triangle text-yellow-600 mt-1 mr-3"></i>
                        <div class="text-sm text-yellow-800">
                            <strong>Important:</strong> This tool modifies your TSX files. Make sure to commit your changes
                            before running, so you can review and revert if needed using <code class="bg-yellow-100 px-1 rounded">git diff</code>.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function initialize() {
        await loadDirectories();
        setupEventListeners();
    }

    function setupEventListeners() {
        const selectionMode = document.getElementById('selection-mode');
        const directorySelection = document.getElementById('directory-selection');
        const fileSelection = document.getElementById('file-selection');
        const dirFilterInput = document.getElementById('directory-filter');
        const fileFilterInput = document.getElementById('file-filter');
        const selectEl = document.getElementById('directory-select');
        const refreshBtn = document.getElementById('refresh-dirs-btn');
        const analyzeBtn = document.getElementById('analyze-btn');
        const applyBtn = document.getElementById('apply-btn');

        // Selection mode toggle
        if (selectionMode) {
            selectionMode.addEventListener('change', (e) => {
                const mode = e.target.value;
                if (mode === 'directory') {
                    directorySelection?.classList.remove('hidden');
                    fileSelection?.classList.add('hidden');
                } else {
                    directorySelection?.classList.add('hidden');
                    fileSelection?.classList.remove('hidden');
                    // Load files if not already loaded
                    if (allFiles.length === 0) {
                        loadFiles();
                    }
                }
            });
        }

        // Directory filter
        if (dirFilterInput) {
            dirFilterInput.addEventListener('input', (e) => {
                renderDirectories(e.target.value);
            });
        }

        // File filter
        if (fileFilterInput) {
            fileFilterInput.addEventListener('input', (e) => {
                renderFiles(e.target.value);
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await loadDirectories();
                await loadFiles();
                if (dirFilterInput) dirFilterInput.value = '';
                if (fileFilterInput) fileFilterInput.value = '';
            });
        }

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', analyzeFiles);
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', applyTranslations);
        }
    }

    async function loadDirectories() {
        const select = document.getElementById('directory-select');
        if (!select) return;

        select.innerHTML = '<option value="">Loading...</option>';

        try {
            const response = await fetch(`${API_BASE}/api/tools/extraction-directories`);
            const data = await response.json();
            allDirectories = data.directories || [];
            renderDirectories();
        } catch (error) {
            console.error('Error loading directories:', error);
            select.innerHTML = '<option value="">Error loading</option>';
        }
    }

    function renderDirectories(filter = '') {
        const select = document.getElementById('directory-select');
        if (!select) return;

        select.innerHTML = '';
        const filterLower = filter.toLowerCase();

        const filtered = filter
            ? allDirectories.filter(d => d.fullPath.toLowerCase().includes(filterLower))
            : allDirectories;

        if (filtered.length === 0) {
            select.innerHTML = '<option value="" disabled>No matching directories</option>';
            return;
        }

        for (const dir of filtered) {
            const option = document.createElement('option');
            option.value = dir.path;
            option.textContent = `${dir.fullPath} (${dir.tsxFiles} tsx)`;
            if (dir.isRoot) option.style.fontWeight = 'bold';
            select.appendChild(option);
        }
    }

    async function loadFiles() {
        const select = document.getElementById('file-select');
        if (!select) return;

        select.innerHTML = '<option value="">Loading files...</option>';

        try {
            const response = await fetch(`${API_BASE}/api/tools/extraction-files`);
            const data = await response.json();
            allFiles = data.files || [];
            renderFiles();
        } catch (error) {
            console.error('Error loading files:', error);
            select.innerHTML = '<option value="">Error loading files</option>';
        }
    }

    function renderFiles(filter = '') {
        const select = document.getElementById('file-select');
        if (!select) return;

        select.innerHTML = '';
        const filterLower = filter.toLowerCase();

        const filtered = filter
            ? allFiles.filter(f => f.toLowerCase().includes(filterLower))
            : allFiles;

        if (filtered.length === 0) {
            select.innerHTML = '<option value="" disabled>No matching files</option>';
            return;
        }

        for (const file of filtered) {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file;
            select.appendChild(option);
        }

        // Add count info
        const info = document.createElement('option');
        info.disabled = true;
        info.value = '';
        info.textContent = `━━━━━ ${filtered.length} files ━━━━━`;
        select.insertBefore(info, select.firstChild);
    }

    async function analyzeFiles() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const applyBtn = document.getElementById('apply-btn');
        const resultsDiv = document.getElementById('analysis-results');
        const applyResultsDiv = document.getElementById('apply-results');

        const mode = document.getElementById('selection-mode')?.value || 'directory';
        const directory = document.getElementById('directory-select')?.value;
        const file = document.getElementById('file-select')?.value;
        const fileType = document.getElementById('extract-file-type')?.value || 'all';
        const limit = document.getElementById('extract-file-limit')?.value;

        if (mode === 'directory' && !directory) {
            UIUtils.showWarning('Please select a directory');
            return;
        }

        if (mode === 'file' && !file) {
            UIUtils.showWarning('Please select a file');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
        applyResultsDiv?.classList.add('hidden');

        try {
            const requestBody = mode === 'file'
                ? { file, fileType: 'all' }
                : { directory, fileType, limit };

            const response = await fetch(`${API_BASE}/api/tools/scan-translations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze');
            }

            scanResults = mode === 'file'
                ? { file, mode, ...data }
                : { directory, fileType, limit, mode, ...data };

            // Update stats
            document.getElementById('stat-files').textContent = data.stats?.filesWithTranslations || 0;
            document.getElementById('stat-translations').textContent = data.stats?.totalTranslations || 0;
            document.getElementById('stat-new-keys').textContent = data.stats?.newKeys || 0;
            document.getElementById('stat-reused').textContent = data.stats?.reusedFromShared || 0;
            document.getElementById('stat-existing').textContent = data.stats?.existingKeys || 0;

            // Render namespace summary
            renderNamespaceSummary(data.namespaceSummary || []);

            // Render file list
            renderFileList(data.files || []);

            resultsDiv?.classList.remove('hidden');
            applyBtn.disabled = !(data.stats?.newKeys > 0);

            UIUtils.showSuccess(`Found ${data.stats?.totalTranslations || 0} translations in ${data.stats?.filesWithTranslations || 0} files`);

        } catch (error) {
            console.error('Error analyzing:', error);
            UIUtils.showError('Analysis failed: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Analyze Files';
        }
    }

    function renderNamespaceSummary(namespaces) {
        const container = document.getElementById('namespace-summary');
        const listEl = document.getElementById('namespace-list');
        if (!container || !listEl) return;

        if (namespaces.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        listEl.innerHTML = namespaces.map(ns => `
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-semibold text-gray-800">${escapeHtml(ns.namespace)}</span>
                    <span class="text-sm text-gray-500">${ns.fileCount} files</span>
                </div>
                <div class="text-2xl font-bold text-purple-600 mb-2">${ns.keyCount} keys</div>
                <div class="text-xs text-gray-500 font-mono">
                    ${ns.keys.slice(0, 5).map(k => escapeHtml(k)).join(', ')}${ns.hasMore || ns.keys.length > 5 ? '...' : ''}
                </div>
            </div>
        `).join('');
    }

    function getStatusBadge(action) {
        switch (action) {
            case 'new':
                return '<span class="text-green-500"><i class="fas fa-plus"></i> new</span>';
            case 'exists':
                return '<span class="text-orange-500"><i class="fas fa-check"></i> exists</span>';
            case 'reuse_from_shared':
                return '<span class="text-cyan-500"><i class="fas fa-link"></i> reused</span>';
            default:
                return '<span class="text-gray-500">unknown</span>';
        }
    }

    function renderFileList(files) {
        const container = document.getElementById('files-list');
        if (!container) return;

        if (files.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No files with translations found</p>';
            return;
        }

        container.innerHTML = files.map(file => {
            // Use new stats structure, fall back to old for backwards compatibility
            const stats = file.stats || { newKeys: file.newKeys || 0, existingKeys: file.existingKeys || 0, reusedFromShared: 0 };

            return `
            <div class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer file-header" data-file="${escapeHtml(file.file)}">
                    <div class="flex items-center">
                        <i class="fas fa-file-code text-blue-500 mr-3"></i>
                        <span class="font-medium text-gray-800">${escapeHtml(file.file)}</span>
                        <span class="ml-3 text-sm text-gray-500">namespace: ${escapeHtml(file.namespace)}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        ${stats.newKeys > 0 ? `<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">${stats.newKeys} new</span>` : ''}
                        ${stats.reusedFromShared > 0 ? `<span class="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-sm">${stats.reusedFromShared} reused</span>` : ''}
                        ${stats.existingKeys > 0 ? `<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">${stats.existingKeys} exist</span>` : ''}
                        <i class="fas fa-chevron-down text-gray-400 toggle-icon"></i>
                    </div>
                </div>
                <div class="file-content hidden px-4 py-3 bg-white">
                    ${file.functionsToUpdate && file.functionsToUpdate.length > 0 ? `
                        <div class="mb-3 p-3 bg-purple-50 rounded border border-purple-200">
                            <div class="text-xs text-purple-600 mb-2 font-semibold">
                                <i class="fas fa-code mr-1"></i>Functions to update (${file.functionsToUpdate.length}):
                            </div>
                            <div class="flex flex-wrap gap-2 mb-2">
                                ${file.functionsToUpdate.map(fn => `<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-mono">${escapeHtml(fn)}()</span>`).join('')}
                            </div>
                            <div class="text-xs text-purple-600 mb-1">Each function will get:</div>
                            <div class="font-mono text-sm text-purple-800 bg-white p-2 rounded">
                                ${file.namespacesUsed ? file.namespacesUsed.map(ns => {
                                    const varName = ns === file.namespace ? 't' : 't' + ns.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
                                    return `const ${escapeHtml(varName)} = useTranslations("${escapeHtml(ns)}");`;
                                }).join('<br>') : ''}
                            </div>
                        </div>
                    ` : (file.declarations && file.declarations.length > 0 ? `
                        <div class="mb-3 p-2 bg-purple-50 rounded text-sm font-mono text-purple-800">
                            <div class="text-xs text-purple-600 mb-1">useTranslations declarations:</div>
                            ${file.declarations.map(d => escapeHtml(d)).join('<br>')}
                        </div>
                    ` : '')}
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-gray-500 border-b">
                                <th class="pb-2 w-16">Line</th>
                                <th class="pb-2 w-24">Type</th>
                                <th class="pb-2">Value</th>
                                <th class="pb-2">Key</th>
                                <th class="pb-2 w-28">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${file.translations.map(t => {
                                // Build the t() call based on parts and context
                                let tCall;
                                const isJsxText = t.type === 'jsx-text';

                                if (t.parts && t.hasMultipleParts) {
                                    if (isJsxText) {
                                        // JSX context: (7 {t("days")})
                                        tCall = t.parts.map(part => {
                                            if (part.type === 'literal') {
                                                return `<span class="text-gray-500">${escapeHtml(part.value)}</span>`;
                                            }
                                            const varName = part.translatorVar || 't';
                                            return `<span class="text-blue-600">{${escapeHtml(varName)}("${escapeHtml(part.finalKey || part.key)}")}</span>`;
                                        }).join('');
                                    } else {
                                        // Attribute context: "(" + "7 " + t("days") + ")"
                                        tCall = t.parts.map(part => {
                                            if (part.type === 'literal') {
                                                return `<span class="text-orange-600">"${escapeHtml(part.value)}"</span>`;
                                            }
                                            const varName = part.translatorVar || 't';
                                            return `<span class="text-blue-600">${escapeHtml(varName)}</span>("${escapeHtml(part.finalKey || part.key)}")`;
                                        }).join(' <span class="text-gray-400">+</span> ');
                                    }
                                } else {
                                    // Single key (backward compatible)
                                    if (isJsxText) {
                                        tCall = `<span class="text-blue-600">{${escapeHtml(t.translatorVar || 't')}("${escapeHtml(t.key)}")}</span>`;
                                    } else {
                                        tCall = `<span class="text-blue-600">${escapeHtml(t.translatorVar || 't')}</span>("${escapeHtml(t.key)}")`;
                                    }
                                }

                                // Show original value, with parts breakdown if multiple
                                let valueDisplay = `"${escapeHtml(truncate(t.value, 40))}"`;
                                if (t.parts && t.hasMultipleParts) {
                                    const keyParts = t.parts.filter(p => p.type === 'key');
                                    if (keyParts.length > 1) {
                                        valueDisplay += `<br><span class="text-xs text-green-600">→ ${keyParts.map(p => `"${escapeHtml(p.value)}"`).join(' + ')}</span>`;
                                    }
                                }

                                return `
                                <tr class="border-b border-gray-100">
                                    <td class="py-2 text-gray-400">${t.line}</td>
                                    <td class="py-2 text-purple-600">${escapeHtml(t.type)}</td>
                                    <td class="py-2 font-mono text-sm text-gray-700">${valueDisplay}</td>
                                    <td class="py-2 font-mono text-sm">
                                        ${tCall}
                                    </td>
                                    <td class="py-2">
                                        ${t.action ? getStatusBadge(t.action) : (t.exists
                                            ? '<span class="text-orange-500"><i class="fas fa-check"></i> exists</span>'
                                            : '<span class="text-green-500"><i class="fas fa-plus"></i> new</span>'
                                        )}
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `}).join('');

        // Add toggle functionality
        container.querySelectorAll('.file-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.toggle-icon');
                content.classList.toggle('hidden');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        });
    }

    async function applyTranslations() {
        const applyBtn = document.getElementById('apply-btn');
        const resultsDiv = document.getElementById('analysis-results');
        const applyResultsDiv = document.getElementById('apply-results');

        if (!scanResults) {
            UIUtils.showWarning('Please analyze files first');
            return;
        }

        const confirmMsg = `This will:\n\n` +
            `1. Modify ${scanResults.stats?.filesWithTranslations || 0} TSX files\n` +
            `2. Add ${scanResults.stats?.newKeys || 0} translation keys to all locale files\n` +
            `3. Convert hardcoded text to t("key") calls\n\n` +
            `Make sure you have committed your changes.\n\nContinue?`;

        if (!confirm(confirmMsg)) return;

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Applying...';

        try {
            const requestBody = scanResults.mode === 'file'
                ? { file: scanResults.file }
                : {
                    directory: scanResults.directory,
                    fileType: scanResults.fileType,
                    limit: scanResults.limit
                };

            const response = await fetch(`${API_BASE}/api/tools/extract-translations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to apply');
            }

            // Show results
            resultsDiv?.classList.add('hidden');
            applyResultsDiv?.classList.remove('hidden');

            document.getElementById('apply-summary').textContent =
                `Processed ${data.stats?.filesProcessed || 0} files, extracted ${data.stats?.keysExtracted || 0} keys, modified ${data.stats?.filesModified || 0} files.`;

            if (data.modifiedFiles?.length) {
                document.getElementById('apply-details').innerHTML = `
                    <h4 class="font-semibold text-green-800 mb-2">Modified Files:</h4>
                    <ul class="list-disc list-inside text-sm text-green-700 max-h-40 overflow-y-auto">
                        ${data.modifiedFiles.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                    </ul>
                `;
            }

            scanResults = null;
            UIUtils.showSuccess('Translation extraction completed!');

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
    window.ExtractTextPage = {
        render,
        initialize
    };
})();
