// Translation Tools Tab Functionality
(function() {
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    function initializeToolsTab() {
        setupEventListeners();
    }

    function setupEventListeners() {
        // Find Duplicates button
        const duplicatesBtn = document.querySelector('[data-tool="duplicates"]');
        if (duplicatesBtn) {
            duplicatesBtn.addEventListener('click', findDuplicates);
        }

        // Other tool buttons (if any)
        document.querySelectorAll('.tool-btn').forEach(btn => {
            if (!btn.hasAttribute('data-tool')) return;
            
            const tool = btn.getAttribute('data-tool');
            if (tool && tool !== 'duplicates') {
                btn.addEventListener('click', () => runTool(tool));
            }
        });
    }

    async function findDuplicates() {
        const btn = document.querySelector('[data-tool="duplicates"]');
        const resultsContainer = document.getElementById('tool-results');
        const resultsContent = document.getElementById('tool-results-content');
        
        if (!resultsContainer || !resultsContent) return;
        
        // Show loading state
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i> Finding Duplicates...';
        
        try {
            const response = await fetch(`${API_BASE}/api/tools/find-duplicates`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to find duplicates');
            }
            
            // Display results
            displayDuplicatesResults(data);
            resultsContainer.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error finding duplicates:', error);
            UIUtils.showError('Failed to find duplicates: ' + error.message);
        } finally {
            // Restore button state
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-copy mr-3"></i> Find Duplicate Values';
        }
    }

    function displayDuplicatesResults(data) {
        const resultsContent = document.getElementById('tool-results-content');
        if (!resultsContent) return;
        
        if (!data.duplicates || data.duplicates.length === 0) {
            resultsContent.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p class="text-green-800">
                        <i class="fas fa-check-circle mr-2"></i>
                        No duplicate values found across translation keys.
                    </p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="text-blue-800 font-semibold">
                        Found ${data.duplicates.length} duplicate values
                    </p>
                </div>
                
                <div class="space-y-4">
                    ${data.duplicates.map(dup => `
                        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="mb-2">
                                <span class="font-semibold text-gray-700">Value:</span>
                                <span class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">${escapeHtml(dup.value)}</span>
                            </div>
                            <div class="mb-2">
                                <span class="font-semibold text-gray-700">Found in ${dup.keys.length} keys:</span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                ${dup.keys.map(key => `
                                    <div class="bg-gray-50 p-2 rounded text-sm">
                                        <code class="text-blue-600">${key}</code>
                                    </div>
                                `).join('')}
                            </div>
                            ${dup.locales && dup.locales.length > 0 ? `
                                <div class="mt-2 text-sm text-gray-600">
                                    <span class="font-semibold">Locales:</span> ${dup.locales.join(', ')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-800 text-sm">
                        <i class="fas fa-info-circle mr-2"></i>
                        Consider consolidating these duplicate values to improve translation consistency and reduce redundancy.
                    </p>
                </div>
            </div>
        `;
        
        resultsContent.innerHTML = html;
    }

    async function runTool(toolName) {
        console.log(`Running tool: ${toolName}`);
        UIUtils.showInfo(`Tool "${toolName}" is not yet implemented`);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Export functions to global scope
    window.toolsTab = {
        initialize: initializeToolsTab,
        findDuplicates,
        runTool
    };

})();