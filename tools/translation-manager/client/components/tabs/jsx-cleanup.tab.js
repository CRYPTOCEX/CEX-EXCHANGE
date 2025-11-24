// JSX Cleanup Tab Functionality
(function() {
    let jsxData = [];
    let filteredData = [];
    let selectedItems = new Set();
    
    // Determine API base URL
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:5000`
        : '';

    // Initialize when DOM is ready (setup event listeners only)
    document.addEventListener('DOMContentLoaded', function() {
        // Don't auto-initialize, wait for router to call it
        // initializeJSXCleanupTab();
    });

    function initializeJSXCleanupTab() {
        // Scan button
        const scanBtn = document.getElementById('scan-jsx');
        if (scanBtn) {
            scanBtn.addEventListener('click', scanJSX);
        }

        // Clean selected button
        const cleanBtn = document.getElementById('clean-jsx');
        if (cleanBtn) {
            cleanBtn.addEventListener('click', cleanSelected);
        }

        // Clean all button
        const cleanAllBtn = document.getElementById('clean-all-jsx');
        if (cleanAllBtn) {
            cleanAllBtn.addEventListener('click', cleanAll);
        }

        // Clear button
        const clearBtn = document.getElementById('clear-jsx');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearResults);
        }

        // Select all checkbox
        const selectAll = document.getElementById('select-all-jsx');
        if (selectAll) {
            selectAll.addEventListener('change', toggleSelectAll);
        }

        // Table select all
        const tableSelectAll = document.getElementById('jsx-table-select-all');
        if (tableSelectAll) {
            tableSelectAll.addEventListener('change', toggleSelectAll);
        }

        // Filter input
        const filterInput = document.getElementById('jsx-filter');
        if (filterInput) {
            filterInput.addEventListener('keyup', filterResults);
        }

        // File filter
        const fileFilter = document.getElementById('jsx-file-filter');
        if (fileFilter) {
            fileFilter.addEventListener('change', filterResults);
        }
    }

    async function scanJSX() {
        const loading = document.getElementById('jsx-loading');
        const empty = document.getElementById('jsx-empty');
        const results = document.getElementById('jsx-results');
        const stats = document.getElementById('jsx-stats');
        
        loading.style.display = 'block';
        empty.style.display = 'none';
        results.style.display = 'none';
        
        try {
            const response = await fetch(`${API_BASE}/api/jsx/scan`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to scan');
            }
            
            jsxData = data.results || [];
            filteredData = [...jsxData];
            
            // Update stats
            document.getElementById('jsx-files-scanned').textContent = data.stats.totalFiles;
            document.getElementById('jsx-total-found').textContent = data.stats.totalFound;
            document.getElementById('jsx-unique-values').textContent = data.stats.uniqueValues;
            document.getElementById('jsx-selected').textContent = '0';
            
            // Populate file filter
            const allFiles = new Set();
            jsxData.forEach(item => {
                item.files.forEach(file => allFiles.add(file));
            });
            
            const fileFilter = document.getElementById('jsx-file-filter');
            fileFilter.innerHTML = '<option value="">All Files</option>';
            Array.from(allFiles).sort().forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file.replace(/^.*[\\/]/, ''); // Show just filename
                fileFilter.appendChild(option);
            });
            
            loading.style.display = 'none';
            stats.style.display = 'grid';
            
            if (jsxData.length > 0) {
                renderResults();
                results.style.display = 'block';
                document.getElementById('clean-jsx').disabled = false;
                document.getElementById('clean-all-jsx').disabled = false;
                document.getElementById('clear-jsx').disabled = false;
                document.getElementById('select-all-jsx').disabled = false;
            } else {
                empty.style.display = 'block';
                empty.innerHTML = `
                    <i class="fas fa-check-circle text-4xl mb-4 text-green-500"></i>
                    <h3 class="text-lg font-semibold mb-2">No Wrapped Strings Found!</h3>
                    <p>All JSX expressions are already optimized.</p>
                `;
            }
        } catch (error) {
            loading.style.display = 'none';
            showError('Failed to scan: ' + error.message);
        }
    }

    function renderResults() {
        const tbody = document.getElementById('jsx-tbody');
        tbody.innerHTML = '';
        
        filteredData.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            
            // Create unique ID for this item
            const itemId = `${item.value}_${item.current}`;
            
            tr.innerHTML = `
                <td class="border p-2">
                    <input type="checkbox" class="jsx-checkbox" data-id="${itemId}" 
                           ${selectedItems.has(itemId) ? 'checked' : ''}>
                </td>
                <td class="border p-2 font-mono text-sm">${escapeHtml(item.value)}</td>
                <td class="border p-2 font-mono text-sm text-red-600">${escapeHtml(item.current)}</td>
                <td class="border p-2 font-mono text-sm text-green-600">${escapeHtml(item.replacement)}</td>
                <td class="border p-2 text-xs">
                    <div class="max-h-20 overflow-y-auto">
                        ${item.files.map(f => `<div>${f.replace(/^.*[\\/]/, '')}</div>`).join('')}
                    </div>
                </td>
                <td class="border p-2 text-center font-semibold">${item.count}</td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add change listeners to checkboxes
        document.querySelectorAll('.jsx-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelection);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updateSelection() {
        selectedItems.clear();
        document.querySelectorAll('.jsx-checkbox:checked').forEach(cb => {
            selectedItems.add(cb.dataset.id);
        });
        document.getElementById('jsx-selected').textContent = selectedItems.size;
    }

    function toggleSelectAll(e) {
        const checked = e.target.checked;
        document.querySelectorAll('.jsx-checkbox').forEach(cb => {
            cb.checked = checked;
        });
        
        // Sync both checkboxes
        document.getElementById('select-all-jsx').checked = checked;
        const tableSelectAll = document.getElementById('jsx-table-select-all');
        if (tableSelectAll) tableSelectAll.checked = checked;
        
        updateSelection();
    }

    function filterResults() {
        const filterText = document.getElementById('jsx-filter').value.toLowerCase();
        const fileFilter = document.getElementById('jsx-file-filter').value;
        
        filteredData = jsxData.filter(item => {
            const matchesFilter = !filterText || 
                item.value.toLowerCase().includes(filterText) ||
                item.current.toLowerCase().includes(filterText);
            const matchesFile = !fileFilter || item.files.includes(fileFilter);
            return matchesFilter && matchesFile;
        });
        
        renderResults();
    }

    async function cleanSelected() {
        if (selectedItems.size === 0) {
            showError('Please select items to clean');
            return;
        }
        
        const itemsToClean = jsxData.filter(item => {
            const itemId = `${item.value}_${item.current}`;
            return selectedItems.has(itemId);
        });
        
        await performClean(itemsToClean);
    }

    async function cleanAll() {
        const confirmClean = confirm(
            `Are you sure you want to clean ALL ${jsxData.length} wrapped strings?\n\n` +
            `This will replace expressions like {'text'} with just text.\n\n` +
            `This action cannot be undone!`
        );
        
        if (!confirmClean) return;
        
        await performClean(jsxData);
    }

    async function performClean(items) {
        showInfo('Cleaning JSX expressions...');
        
        try {
            const response = await fetch(`${API_BASE}/api/jsx/clean`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to clean');
            }
            
            showSuccess(result.message || `Successfully cleaned JSX expressions`);
            
            // Re-scan to update the list
            setTimeout(() => scanJSX(), 2000);
        } catch (error) {
            showError('Failed to clean: ' + error.message);
        }
    }

    function clearResults() {
        document.getElementById('jsx-empty').style.display = 'block';
        document.getElementById('jsx-results').style.display = 'none';
        document.getElementById('jsx-stats').style.display = 'none';
        document.getElementById('clean-jsx').disabled = true;
        document.getElementById('clean-all-jsx').disabled = true;
        document.getElementById('clear-jsx').disabled = true;
        document.getElementById('select-all-jsx').disabled = true;
        
        jsxData = [];
        filteredData = [];
        selectedItems.clear();
    }

    function showSuccess(message) {
        const successDiv = document.getElementById('jsx-success');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }

    function showError(message) {
        const errorDiv = document.getElementById('jsx-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    
    function showInfo(message) {
        const successDiv = document.getElementById('jsx-success');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
    
    // Export functions to global scope
    window.jsxCleanupTab = {
        initialize: initializeJSXCleanupTab,
        scanJSX,
        cleanSelected,
        cleanAll,
        toggleSelectAll,
        clearResults: () => {
            jsxData = [];
            filteredData = [];
            selectedItems.clear();
            renderResults();
        }
    };
})();