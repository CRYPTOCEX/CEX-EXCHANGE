class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = 'dashboard';
        this.init();
    }

    init() {
        // Handle browser navigation
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });

        // Setup navigation listeners
        this.setupNavigationListeners();
        
        // Delay initial route handling until after app initialization
        setTimeout(() => {
            this.handleRoute();
        }, 500);
    }

    setupNavigationListeners() {
        // Handle navigation links
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-route]') || e.target.matches('[data-tab]') || e.target.matches('.sidebar-item')) {
                e.preventDefault();
                const route = e.target.getAttribute('data-route') || 
                             e.target.getAttribute('data-tab') ||
                             e.target.getAttribute('href')?.replace('#', '');
                if (route) {
                    this.navigateTo(route);
                }
            }
        });

        // Handle tab switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-tab')) {
                e.preventDefault();
                // Remove active class from all tabs
                document.querySelectorAll('.nav-tab').forEach(tab => 
                    tab.classList.remove('active')
                );
                // Add active class to clicked tab
                e.target.classList.add('active');
                
                // Get route from tab
                const route = e.target.getAttribute('data-route') || 
                            e.target.getAttribute('href')?.replace('#', '');
                if (route) {
                    this.navigateTo(route);
                }
            }
        });
    }

    register(path, handler) {
        this.routes.set(path, handler);
    }

    navigateTo(path) {
        if (path !== this.currentRoute) {
            this.currentRoute = path;
            
            // Update URL without page reload
            const url = path === this.defaultRoute ? '/' : `#${path}`;
            history.pushState({ route: path }, '', url);
            
            // Execute route handler
            this.executeRoute(path);
            
            // Update active navigation
            this.updateNavigation(path);
        }
    }

    handleRoute() {
        let path = window.location.hash.replace('#', '');
        if (!path || path === '/') {
            path = this.defaultRoute;
        }
        
        this.currentRoute = path;
        this.executeRoute(path);
        this.updateNavigation(path);
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
        // Update tab states
        document.querySelectorAll('.nav-tab').forEach(tab => {
            const tabRoute = tab.getAttribute('data-route') || 
                           tab.getAttribute('href')?.replace('#', '');
            
            if (tabRoute === activePath) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Don't manipulate tab content here - let app.js showTab() handle it
        // The route handler will call showTab() which properly manages visibility
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