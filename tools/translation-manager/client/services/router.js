class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = 'dashboard';
        this.init();
    }

    init() {
        // Setup navigation listeners
        this.setupNavigationListeners();

        // Delay initial route handling until after app initialization
        setTimeout(() => {
            this.handleInitialRoute();
        }, 500);
    }

    setupNavigationListeners() {
        // Handle navigation links
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-route]') ||
                          e.target.closest('[data-tab]') ||
                          e.target.closest('[data-page]') ||
                          e.target.closest('.sidebar-item');

            if (target) {
                e.preventDefault();

                // Check for page navigation first
                const pageId = target.getAttribute('data-page');
                if (pageId && window.PageRouter) {
                    window.PageRouter.navigateTo(pageId);
                    return;
                }

                // Regular tab/route navigation
                const route = target.getAttribute('data-route') ||
                             target.getAttribute('data-tab') ||
                             target.getAttribute('href')?.replace('#', '');
                if (route) {
                    this.navigateTo(route);
                }
            }
        });
    }

    register(path, handler) {
        this.routes.set(path, handler);
    }

    navigateTo(path, pushState = true) {
        if (path !== this.currentRoute) {
            this.currentRoute = path;

            // Clear any active page when switching to a tab
            if (window.PageRouter) {
                window.PageRouter.clearCurrentPage();
            }

            // Execute route handler
            this.executeRoute(path);

            // Update active navigation
            this.updateNavigation(path);

            // Update browser URL without page refresh
            if (pushState) {
                const url = path === this.defaultRoute ? '/' : `/${path}`;
                history.pushState({ type: 'tab', tabId: path }, `${path} - Translation Manager`, url);
            }

            // Update document title
            document.title = `${this.formatTitle(path)} - Translation Manager`;
        }
    }

    formatTitle(path) {
        return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
    }

    handleInitialRoute() {
        const path = window.location.pathname.replace(/^\//, '');

        // First check if PageRouter can handle it (for pages)
        if (path && window.PageRouter && window.PageRouter.hasPage(path)) {
            window.PageRouter.navigateTo(path, false);
            return;
        }

        // Check if it's a registered tab route
        if (path && this.routes.has(path)) {
            this.currentRoute = path;
            this.executeRoute(path);
            this.updateNavigation(path);
            return;
        }

        // Default to dashboard
        this.currentRoute = this.defaultRoute;
        this.executeRoute(this.defaultRoute);
        this.updateNavigation(this.defaultRoute);

        // Set initial state for root URL
        if (!path) {
            history.replaceState({ type: 'tab', tabId: this.defaultRoute }, 'Dashboard - Translation Manager', '/');
        }
    }

    executeRoute(path) {
        const handler = this.routes.get(path);
        if (handler) {
            try {
                handler();
            } catch (error) {
                console.error(`Error executing route ${path}:`, error);
                UIUtils.showError(`Failed to load ${path}`);
            }
        } else {
            console.warn(`No handler found for route: ${path}`);
            // Fallback to dashboard
            if (path !== this.defaultRoute) {
                this.navigateTo(this.defaultRoute);
            }
        }
    }

    updateNavigation(activePath) {
        // Update sidebar item states
        document.querySelectorAll('.sidebar-item').forEach(item => {
            const itemRoute = item.getAttribute('data-tab') ||
                             item.getAttribute('data-route');

            if (itemRoute === activePath) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    isCurrentRoute(path) {
        return this.currentRoute === path;
    }

    reload() {
        this.executeRoute(this.currentRoute);
    }
}

// Create singleton instance
window.router = new Router();
