// Page Router - Handles routing between pages with URL history support
(function() {
    // Available pages configuration
    const pages = {
        'extract-text': {
            module: 'ExtractTextPage',
            title: 'Extract Text to Translations'
        },
        'extract-menu': {
            module: 'ExtractMenuPage',
            title: 'Extract Menu Translations'
        },
        'sync-translations': {
            module: 'SyncTranslationsPage',
            title: 'Sync All Translations'
        },
        'ai-translate': {
            module: 'AITranslatePage',
            title: 'AI Translation'
        },
        'untranslatable': {
            module: 'UntranslatablePage',
            title: 'Untranslatable Texts'
        },
        'orphaned': {
            module: 'OrphanedPage',
            title: 'Orphaned Keys'
        },
        'jsx-cleanup': {
            module: 'JSXCleanupPage',
            title: 'JSX Cleanup'
        },
        'optimize-namespaces': {
            module: 'OptimizeNamespacesPage',
            title: 'Optimize Namespaces'
        },
        'optimize-keys': {
            module: 'OptimizeKeysPage',
            title: 'Optimize Keys'
        }
    };

    // Current page state
    let currentPage = null;

    /**
     * Navigate to a page
     * @param {string} pageId - The page identifier
     * @param {boolean} pushState - Whether to push to browser history (default: true)
     */
    function navigateTo(pageId, pushState = true) {
        const pageConfig = pages[pageId];
        if (!pageConfig) {
            console.error(`Unknown page: ${pageId}`);
            return false;
        }

        const pageModule = window[pageConfig.module];
        if (!pageModule) {
            console.error(`Page module not loaded: ${pageConfig.module}`);
            return false;
        }

        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
            tab.classList.remove('active');
        });

        // Show page container
        const pageContainer = document.getElementById('page-container');
        if (pageContainer) {
            pageContainer.classList.remove('hidden');
        }

        // Get the content container
        const container = document.getElementById('page-content');
        if (!container) {
            console.error('Page content container not found');
            return false;
        }

        // Render the page
        container.innerHTML = pageModule.render();

        // Initialize the page
        if (pageModule.initialize) {
            pageModule.initialize();
        }

        currentPage = pageId;

        // Update browser URL without page refresh
        if (pushState) {
            const url = `/${pageId}`;
            history.pushState({ type: 'page', pageId }, pageConfig.title, url);
        }

        // Update document title
        document.title = `${pageConfig.title} - Translation Manager`;

        // Update sidebar navigation
        updateSidebarNavigation(pageId);

        return true;
    }

    /**
     * Update sidebar navigation for page routes
     */
    function updateSidebarNavigation(pageId) {
        // Remove active class from all sidebar items
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to matching page route
        const activeItem = document.querySelector(`[data-page="${pageId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    /**
     * Get the current page ID
     */
    function getCurrentPage() {
        return currentPage;
    }

    /**
     * Check if a page is registered
     */
    function hasPage(pageId) {
        return !!pages[pageId];
    }

    /**
     * Clear current page (when switching to a tab)
     */
    function clearCurrentPage() {
        const pageContainer = document.getElementById('page-container');
        if (pageContainer) {
            pageContainer.classList.add('hidden');
        }
        currentPage = null;
    }

    /**
     * Handle initial URL on page load
     */
    function handleInitialUrl() {
        const path = window.location.pathname.replace(/^\//, '');

        if (path && hasPage(path)) {
            // Navigate to the page from URL without pushing state again
            navigateTo(path, false);
            return true;
        }

        return false;
    }

    /**
     * Handle browser back/forward navigation
     */
    function handlePopState(event) {
        if (event.state && event.state.type === 'page') {
            navigateTo(event.state.pageId, false);
        } else if (event.state && event.state.type === 'tab') {
            // Let Router handle tab navigation
            if (window.router) {
                window.router.navigateTo(event.state.tabId, false);
            }
        } else {
            // No state or root - go to dashboard
            if (window.router) {
                window.router.navigateTo('dashboard', false);
            }
        }
    }

    // Setup popstate listener for browser back/forward
    window.addEventListener('popstate', handlePopState);

    // Export
    window.PageRouter = {
        navigateTo,
        getCurrentPage,
        hasPage,
        clearCurrentPage,
        handleInitialUrl,
        pages
    };
})();
