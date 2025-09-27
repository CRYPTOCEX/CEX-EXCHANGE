// Layout Component System for Documentation
class DocsLayout {
    constructor() {
        this.sidebarItems = [];
        this.currentPage = '';
        this.searchIndex = [];
        this.routes = new Map();
        this.isLoading = false;
        this.sidebarStates = this.loadSidebarStates();
        this.searchIndexBuilt = false;
        this.cacheVersion = '1.0.030259'; // Update this when deploying changes
    }

    // Initialize the layout with configuration
    init(config = {}) {
        this.config = {
            title: config.title || 'Documentation',
            logo: config.logo || 'V5',
            githubUrl: config.githubUrl || '#',
            searchEnabled: config.searchEnabled !== false,
            ...config
        };

        // Make this instance globally available for toggle functions
        window.docsLayout = this;

        // Set up default navigation
        this.setupDefaultNavigation();
        this.setupHeader();
        this.setupSidebar();
        this.setupSearch();
        this.initTheme(); // Use new theme initialization
        this.setupMobileMenu();
        this.setupRouting();
        this.handleInitialRoute();
        
        // Start building search index in background
        setTimeout(() => {
            this.buildSearchIndex().then(() => {
                // Optionally show a subtle notification that search is ready
                console.log('Search index built successfully');
            });
        }, 1000);
    }

    // Set up default navigation items
    setupDefaultNavigation() {
        this.sidebarItems = [
            {
                title: 'Getting Started',
                items: [
                    { title: 'Overview', href: '#home', icon: '📖' },
                    { title: 'Patch Notes', href: '#patch-notes', icon: '🚀' },
                    { title: 'Migration Guide', href: '#migration-guide', icon: '🔄' },
                    { title: 'Server Requirements', href: '#server-requirements', icon: '🖥️' }
                ]
            },
            {
                title: 'Installation',
                items: [
                    { title: 'Bicrypto Virtualmin Setup', href: '#virtualmin-setup', icon: '📦' },
                    { title: 'Nginx Configuration', href: '#nginx-configuration', icon: '🌐' }
                ]
            },
            {
                title: 'Core Configuration',
                items: [
                    { title: 'App Configuration', href: '#app-configuration', icon: '🏠' },
                    { title: 'Authentication Setup', href: '#authentication-setup', icon: '🔐' },
                    { title: 'Email & SMS Setup', href: '#email-sms-setup', icon: '📧' }
                ]
            },
            {
                title: 'Payment Gateways',
                items: [
                    { title: 'Overview', href: '#payment-gateways', icon: '💳' },
                    {
                        title: 'Global Providers',
                        href: '',
                        icon: '🌍',
                        isGroup: true,
                        children: [
                            { title: 'Stripe', href: '#stripe', icon: '💙' },
                            { title: 'PayPal', href: '#paypal', icon: '💛' },
                            { title: 'Authorize.Net', href: '#authorize-net', icon: '🔴' },
                            { title: 'Adyen', href: '#adyen', icon: '💚' },
                            { title: '2Checkout', href: '#2checkout', icon: '💜' }
                        ]
                    },
                    {
                        title: 'Regional Specialists',
                        href: '',
                        icon: '🗺️',
                        isGroup: true,
                        children: [
                            { title: 'PayU', href: '#payu', icon: '🟢' },
                            { title: 'Paytm (India)', href: '#paytm', icon: '🇮🇳' },
                            { title: 'dLocal', href: '#dlocal', icon: '🟠' },
                            { title: 'eWAY (ANZ)', href: '#eway', icon: '🔵' },
                            { title: 'iPay88 (SEA)', href: '#ipay88', icon: '🟣' },
                            { title: 'PayFast (ZA)', href: '#payfast', icon: '🟢' },
                            { title: 'Paystack (Africa)', href: '#paystack', icon: '🔵' }
                        ]
                    },
                    {
                        title: 'European & Alternative',
                        href: '',
                        icon: '🇪🇺',
                        isGroup: true,
                        children: [
                            { title: 'Mollie', href: '#mollie', icon: '🩷' },
                            { title: 'Paysafe', href: '#paysafe', icon: '🔷' },
                            { title: 'Klarna (BNPL)', href: '#klarna', icon: '🩷' }
                        ]
                    }
                ]
            },
            {
                title: 'Extensions',
                items: [
                    {
                        title: 'Ecosystem',
                        href: '',
                        icon: '🌟',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#ecosystem-installation', icon: '🚀' },
                            { title: 'Master Wallet', href: '#ecosystem-master-wallet', icon: '👑' },
                            { title: 'Custodial Wallets', href: '#ecosystem-custodial-wallets', icon: '🏦' },
                            { title: 'Token Management', href: '#ecosystem-token-management', icon: '🪙' },
                            { title: 'Token Types', href: '#ecosystem-token-types', icon: '🏷️' },
                            { title: 'Markets', href: '#ecosystem-markets', icon: '📈' },
                            {
                                title: 'Blockchain Integration',
                                href: '',
                                icon: '🔗',
                                isGroup: true,
                                children: [
                                    { title: 'Ethereum', href: '#blockchain-ethereum', icon: '⟡' },
                                    { title: 'Base Network', href: '#blockchain-base', icon: '🔵' },
                                    { title: 'TON (The Open Network)', href: '#blockchain-ton', icon: '💎' },
                                    { title: 'Tron', href: '#blockchain-tron', icon: '🔴' },
                                    { title: 'Binance Smart Chain', href: '#blockchain-bsc', icon: '⚡' },
                                    { title: 'Polygon', href: '#blockchain-polygon', icon: '🔷' },
                                    { title: 'Fantom', href: '#blockchain-fantom', icon: '👻' },
                                    { title: 'Optimism', href: '#blockchain-optimism', icon: '🔴' },
                                    { title: 'Arbitrum', href: '#blockchain-arbitrum', icon: '🌀' },
                                    { title: 'Celo', href: '#blockchain-celo', icon: '🌱' },
                                    { title: 'Monero', href: '#blockchain-monero', icon: '🔒' },
                                    { title: 'UTXO Networks', href: '#blockchain-utxo', icon: '₿' },
                                    { title: 'Solana', href: '#blockchain-solana', icon: '◎' }
                                ]
                            }
                        ]
                    },
                    {
                        title: 'AI Investment',
                        href: '',
                        icon: '🤖',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#ai-investment-installation', icon: '🚀' },
                            { title: 'Investment Plans', href: '#ai-investment-plans', icon: '📈' },
                            { title: 'Duration Management', href: '#ai-investment-durations', icon: '⏰' }
                        ]
                    },
                    {
                        title: 'Ecommerce',
                        href: '',
                        icon: '🛒',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#ecommerce-installation', icon: '🚀' },
                            { title: 'Product Management', href: '#ecommerce-products', icon: '📦' },
                            { title: 'Order Management', href: '#ecommerce-orders', icon: '🛍️' },
                            { title: 'Settings & Configuration', href: '#ecommerce-settings', icon: '⚙️' }
                        ]
                    },
                    {
                        title: 'FAQ System',
                        href: '',
                        icon: '❓',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#faq-installation', icon: '🚀' },
                            { title: 'Category Management', href: '#faq-categories', icon: '🗂️' },
                            { title: 'Question Management', href: '#faq-questions', icon: '❓' },
                            { title: 'AI Integration', href: '#faq-ai-integration', icon: '🤖' }
                        ]
                    },
                    {
                        title: 'Forex',
                        href: '',
                        icon: '📈',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#forex-installation', icon: '🚀' },
                            { title: 'Plan Management', href: '#forex-plans', icon: '📈' },
                            { title: 'Investment Tracking', href: '#forex-investments', icon: '💰' },
                            { title: 'Trading Signals', href: '#forex-signals', icon: '📡' },
                            { title: 'Account Management', href: '#forex-accounts', icon: '👥' }
                        ]
                    },
                    {
                        title: 'Futures',
                        href: '',
                        icon: '⚡',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#futures-installation', icon: '🚀' },
                            { title: 'Market Management', href: '#futures-markets', icon: '📈' },
                            { title: 'Position Tracking', href: '#futures-positions', icon: '📊' },
                            { title: 'Order Management', href: '#futures-orders', icon: '⚡' }
                        ]
                    },
                    {
                        title: 'ICO',
                        href: '',
                        icon: '🪙',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#ico-installation', icon: '🚀' },
                            { title: 'Offer Management', href: '#ico-offers', icon: '🪙' },
                            { title: 'Transaction Tracking', href: '#ico-transactions', icon: '💰' },
                            { title: 'Settings & Configuration', href: '#ico-settings', icon: '⚙️' }
                        ]
                    },
                    {
                        title: 'MailWizard',
                        href: '',
                        icon: '📧',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#mailwizard-installation', icon: '🚀' },
                            { title: 'Template Management', href: '#mailwizard-templates', icon: '📧' },
                            { title: 'Campaign Management', href: '#mailwizard-campaigns', icon: '🎯' },
                            { title: 'Settings & Configuration', href: '#mailwizard-settings', icon: '⚙️' }
                        ]
                    },
                    {
                        title: 'Affiliate',
                        href: '',
                        icon: '🤝',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#affiliate-installation', icon: '🚀' },
                            { title: 'User Features', href: '#affiliate-user-features', icon: '👤' },
                            { title: 'Admin Management', href: '#affiliate-admin-management', icon: '👑' }
                        ]
                    },
                    {
                        title: 'P2P Trading',
                        href: '',
                        icon: '🤝',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#p2p-installation', icon: '🚀' },
                            { title: 'Offer Management', href: '#p2p-offers', icon: '💼' },
                            { title: 'Trade Management', href: '#p2p-trades', icon: '🤝' },
                            { title: 'Dispute Resolution', href: '#p2p-disputes', icon: '⚖️' }
                        ]
                    },
                    {
                        title: 'Staking',
                        href: '',
                        icon: '💰',
                        isGroup: true,
                        children: [
                            { title: 'Installation', href: '#staking-installation', icon: '🚀' },
                            { title: 'Pool Management', href: '#staking-pools', icon: '🏊‍♂️' },
                            { title: 'Position Management', href: '#staking-positions', icon: '📊' },
                            { title: 'Rewards & Earnings', href: '#staking-rewards', icon: '💰' }
                        ]
                    }
                ]
            },
            {
                title: 'Integrations',
                items: [
                    { title: 'Exchange Integration', href: '#exchange-integration', icon: '🏛️' },
                    { title: 'AI Configuration', href: '#ai-configuration', icon: '🤖' }
                ]
            }
        ];
        
        // Register routes for content loading
        this.registerRoutes();
    }

    // Set up the header with dynamic content
    setupHeader() {
        const headerTitle = document.querySelector('[data-header-title]');
        if (headerTitle) {
            headerTitle.textContent = this.config.title;
        }

        const logoText = document.querySelector('[data-logo-text]');
        if (logoText) {
            logoText.textContent = this.config.logo;
        }

        const githubLink = document.querySelector('[data-github-link]');
        if (githubLink && this.config.githubUrl) {
            githubLink.href = this.config.githubUrl;
        }
    }

    // Set up sidebar navigation
    setupSidebar(items = null) {
        // Use provided items or fall back to default navigation
        if (items) {
            this.sidebarItems = items;
        }
        
        const sidebarNav = document.querySelector('[data-sidebar-nav]');
        
        if (sidebarNav && this.sidebarItems.length > 0) {
            sidebarNav.innerHTML = this.generateSidebarHTML(this.sidebarItems);
        }
    }

    // Generate sidebar HTML from items array
    generateSidebarHTML(items) {
        return items.map((section, sectionIndex) => {
            const sectionId = `section-${sectionIndex}`;
            const isCollapsed = this.sidebarStates[section.title] !== undefined ? this.sidebarStates[section.title] : false;
            const sectionHTML = `
                <div class="mb-2" data-section-id="${section.title}">
                    <button 
                        class="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                        onclick="window.docsLayout.toggleSidebarSection('${section.title}', this)"
                    >
                        <span>${section.title}</span>
                        <svg data-chevron class="w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    <div data-section-content class="mt-2 space-y-1 ${isCollapsed ? 'hidden' : ''}">
                        ${section.items.map(item => this.generateNestedItem(item, 2)).join('')}
                    </div>
                </div>
            `;
            return sectionHTML;
        }).join('');
    }

    // Generate nested item HTML (supports multiple levels)
    generateNestedItem(item, indentLevel = 2) {
        if (item.isGroup && item.children) {
            const groupId = `group-${item.title.replace(/\s+/g, '-').toLowerCase()}`;
            const isGroupCollapsed = this.sidebarStates[groupId] !== undefined ? this.sidebarStates[groupId] : false;
            
            // Use style for custom indentation to support any level
            const marginLeft = indentLevel * 8; // 8px per level
            const contentMarginLeft = (indentLevel + 2) * 8;
            
            return `
                <div style="margin-left: ${marginLeft}px;" data-group-id="${groupId}">
                    <button 
                        class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                        onclick="window.docsLayout.toggleSidebarGroup('${groupId}', this)"
                    >
                        <div class="flex items-center">
                            <span class="mr-3 flex-shrink-0 h-5 w-5">
                                ${item.icon || '📄'}
                            </span>
                            <span class="truncate">${item.title}</span>
                        </div>
                        <svg data-chevron class="w-4 h-4 transition-transform ${isGroupCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    <div data-group-content style="margin-left: ${contentMarginLeft}px;" class="space-y-1 ${isGroupCollapsed ? 'hidden' : ''}">
                        ${item.children.map(child => this.generateNestedItem(child, 0)).join('')}
                    </div>
                </div>
            `;
        } else {
            return `
                <a href="${item.href}" 
                   class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 ${item.href === this.currentPage ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-l-4 border-blue-500 pl-2' : ''}">
                    <span class="mr-3 flex-shrink-0 h-4 w-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 ${item.href === this.currentPage ? 'text-blue-600 dark:text-blue-400' : ''}">
                        ${item.icon || '📄'}
                    </span>
                    <span class="truncate text-sm">${item.title}</span>
                </a>
            `;
        }
    }

    // Set up search functionality
    setupSearch() {
        const searchInput = document.querySelector('[data-search-input]');
        if (searchInput && this.config.searchEnabled) {
            // Create search results container
            this.createSearchResults(searchInput);
            
            searchInput.addEventListener('input', this.debounce((e) => {
                this.performSearch(e.target.value);
            }, 300));
            
            // Hide results when clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target)) {
                    this.hideSearchResults();
                }
            });
        }
    }

    // Create search results container
    createSearchResults(searchInput) {
        const container = searchInput.parentElement;
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'search-results hidden absolute top-full left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg mt-2 max-h-80 overflow-y-auto z-50';
        resultsDiv.setAttribute('data-search-results', '');
        container.appendChild(resultsDiv);
    }

    // Perform search across content
    async performSearch(query) {
        const resultsContainer = document.querySelector('[data-search-results]');
        if (!resultsContainer) return;

        if (query.length < 2) {
            this.hideSearchResults();
            return;
        }
        
        // Build search index if not already built
        if (!this.searchIndexBuilt) {
            await this.buildSearchIndex();
        }
        
        // Build search results from navigation, routes, and search index
        const searchResults = this.buildSearchResults(query);
        
        if (searchResults.length === 0) {
            const indexingMessage = !this.searchIndexBuilt ? 
                '<div class="text-xs text-blue-600 dark:text-blue-400 mb-2">Still indexing documentation...</div>' : 
                '';
            resultsContainer.innerHTML = `
                <div class="p-4 text-zinc-500 dark:text-zinc-400 text-sm">
                    ${indexingMessage}
                    No results found for "${query}"
                    <div class="text-xs mt-2 text-zinc-400 dark:text-zinc-500">
                        Try searching for: installation, configuration, setup, API, or extension names
                    </div>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = searchResults.map(result => `
                <a href="${result.href}" class="block p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700 last:border-b-0 transition-colors">
                    <div class="font-medium text-zinc-900 dark:text-zinc-100">${this.highlightSearchTerm(result.title, query)}</div>
                    <div class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">${this.highlightSearchTerm(result.description, query)}</div>
                    ${result.type ? `<div class="text-xs text-blue-600 dark:text-blue-400 mt-1">${result.type}</div>` : ''}
                </a>
            `).join('');
        }
        
        resultsContainer.classList.remove('hidden');
    }

    // Build comprehensive search index from all documentation files
    async buildSearchIndex() {
        const indexPromises = [];
        
        this.routes.forEach((route, routeKey) => {
            if (route.contentFile) {
                indexPromises.push(this.indexDocumentContent(routeKey, route));
            }
        });
        
        try {
            const indexResults = await Promise.all(indexPromises);
            this.searchIndex = indexResults.flat().filter(item => item !== null);
            this.searchIndexBuilt = true;
        } catch (error) {
            console.warn('Failed to build search index:', error);
            this.searchIndexBuilt = true; // Prevent repeated attempts
        }
    }

    // Index content from a single document
    async indexDocumentContent(routeKey, route) {
        try {
            const response = await fetch(route.contentFile);
            if (!response.ok) return null;
            
            const content = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            
            const items = [];
            
            // Index headings
            const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(heading => {
                items.push({
                    title: heading.textContent.trim(),
                    content: heading.textContent.trim(),
                    href: `#${routeKey}`,
                    type: 'Heading',
                    route: routeKey,
                    routeTitle: route.title
                });
            });
            
            // Index paragraphs and list items
            const textElements = doc.querySelectorAll('p, li, td');
            textElements.forEach(element => {
                const text = element.textContent.trim();
                if (text.length > 20) { // Only index substantial content
                    items.push({
                        title: route.title,
                        content: text,
                        href: `#${routeKey}`,
                        type: 'Content',
                        route: routeKey,
                        routeTitle: route.title
                    });
                }
            });
            
            return items;
        } catch (error) {
            console.warn(`Failed to index ${route.contentFile}:`, error);
            return null;
        }
    }

    // Highlight search terms in text
    highlightSearchTerm(text, query) {
        if (!query || query.length < 2) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
    }

    // Build search results from available content
    buildSearchResults(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        // Search through the built search index (all documentation content)
        this.searchIndex.forEach(item => {
            const titleMatch = item.title.toLowerCase().includes(queryLower);
            const contentMatch = item.content.toLowerCase().includes(queryLower);
            
            if (titleMatch || contentMatch) {
                const relevance = titleMatch ? 
                    item.title.toLowerCase().indexOf(queryLower) : 
                    item.content.toLowerCase().indexOf(queryLower) + 1000; // Lower priority for content matches
                
                let description = '';
                if (contentMatch && item.type === 'Content') {
                    const matchIndex = item.content.toLowerCase().indexOf(queryLower);
                    const start = Math.max(0, matchIndex - 50);
                    const end = Math.min(item.content.length, matchIndex + 100);
                    description = (start > 0 ? '...' : '') + 
                                 item.content.substring(start, end) + 
                                 (end < item.content.length ? '...' : '');
                } else {
                    description = `From ${item.routeTitle}`;
                }
                
                results.push({
                    title: titleMatch ? item.title : item.routeTitle,
                    href: item.href,
                    description: description,
                    type: item.type,
                    relevance: relevance
                });
            }
        });
        
        // Search through all registered routes and their content
        this.routes.forEach((route, routeKey) => {
            const routeTitle = route.title;
            const routeHref = `#${routeKey}`;
            
            // Check if route title matches
            if (routeTitle.toLowerCase().includes(queryLower)) {
                results.push({
                    title: routeTitle,
                    href: routeHref,
                    description: `Documentation page`,
                    type: 'Page',
                    relevance: routeTitle.toLowerCase().indexOf(queryLower)
                });
            }
        });

        // Enhanced search through navigation items with nested support
        const searchNavigationItems = (items, sectionTitle) => {
            items.forEach(item => {
                if (item.title.toLowerCase().includes(queryLower)) {
                    results.push({
                        title: item.title,
                        href: item.href,
                        description: `${sectionTitle} - ${item.title}`,
                        type: sectionTitle,
                        relevance: item.title.toLowerCase().indexOf(queryLower)
                    });
                }
                
                // Search nested children
                if (item.children) {
                    searchNavigationItems(item.children, item.title);
                }
            });
        };

        this.sidebarItems.forEach(section => {
            // Search section title
            if (section.title.toLowerCase().includes(queryLower)) {
                results.push({
                    title: section.title,
                    href: section.href || '#',
                    description: `Documentation section`,
                    type: 'Section',
                    relevance: section.title.toLowerCase().indexOf(queryLower)
                });
            }
            
            searchNavigationItems(section.items, section.title);
        });
        
        // Search through current page headings
        const headings = document.querySelectorAll('#dynamic-content h1, #dynamic-content h2, #dynamic-content h3, #dynamic-content h4, #dynamic-content h5, #dynamic-content h6, [data-content-area] h1, [data-content-area] h2, [data-content-area] h3, [data-content-area] h4, [data-content-area] h5, [data-content-area] h6');
        headings.forEach(heading => {
            if (heading.textContent.toLowerCase().includes(queryLower)) {
                const id = heading.id || this.generateId(heading.textContent);
                heading.id = id; // Ensure ID is set
                results.push({
                    title: heading.textContent,
                    href: `#${id}`,
                    description: `${heading.tagName} heading on current page`,
                    type: 'Heading',
                    relevance: heading.textContent.toLowerCase().indexOf(queryLower)
                });
            }
        });
        
        // Search through current page text content with better context
        const contentElements = document.querySelectorAll('#dynamic-content p, #dynamic-content li, #dynamic-content td, [data-content-area] p, [data-content-area] li, [data-content-area] td');
        contentElements.forEach(element => {
            const text = element.textContent;
            if (text.toLowerCase().includes(queryLower)) {
                const matchIndex = text.toLowerCase().indexOf(queryLower);
                const start = Math.max(0, matchIndex - 50);
                const end = Math.min(text.length, matchIndex + 150);
                const snippet = (start > 0 ? '...' : '') + 
                               text.substring(start, end) + 
                               (end < text.length ? '...' : '');
                
                const heading = this.findNearestHeading(element);
                const headingId = heading ? (heading.id || this.generateId(heading.textContent)) : null;
                if (heading && !heading.id && headingId) {
                    heading.id = headingId;
                }
                
                results.push({
                    title: heading ? heading.textContent : 'Content',
                    href: headingId ? `#${headingId}` : '#',
                    description: snippet,
                    type: 'Content',
                    relevance: matchIndex
                });
            }
        });
        
        // Remove duplicates and sort by relevance
        const uniqueResults = results.filter((result, index, self) => {
            const duplicateIndex = self.findIndex(r => 
                r.href === result.href && 
                r.title === result.title && 
                r.type === result.type
            );
            return index === duplicateIndex;
        });
        
        // Sort by relevance (lower index = higher relevance) and limit results
        return uniqueResults
            .sort((a, b) => {
                // Prioritize exact title matches
                const aIsExactTitle = a.type === 'Page' || a.type === 'Section';
                const bIsExactTitle = b.type === 'Page' || b.type === 'Section';
                
                if (aIsExactTitle && !bIsExactTitle) return -1;
                if (!aIsExactTitle && bIsExactTitle) return 1;
                
                return (a.relevance || 0) - (b.relevance || 0);
            })
            .slice(0, 12); // Increased to 12 results
    }

    // Find the nearest heading above an element
    findNearestHeading(element) {
        let current = element;
        while (current && current !== document.body) {
            const prevSibling = current.previousElementSibling;
            if (prevSibling && /^H[1-6]$/.test(prevSibling.tagName)) {
                return prevSibling;
            }
            current = current.parentElement;
        }
        return null;
    }

    // Hide search results
    hideSearchResults() {
        const resultsContainer = document.querySelector('[data-search-results]');
        if (resultsContainer) {
            resultsContainer.classList.add('hidden');
        }
    }

    // Set up mobile menu functionality
    setupMobileMenu() {
        const mobileMenuToggle = document.querySelector('[data-mobile-menu-toggle]');
        const mobileMenu = document.querySelector('[data-mobile-menu]');
        const mobileMenuOverlay = document.querySelector('[data-mobile-menu-overlay]');

        if (mobileMenuToggle && mobileMenu) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        if (mobileMenuOverlay) {
            mobileMenuOverlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }
    }

    // Toggle mobile menu
    toggleMobileMenu() {
        const mobileMenu = document.querySelector('[data-mobile-menu]');
        const isOpen = mobileMenu.classList.contains('translate-x-0');
        
        if (isOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    // Open mobile menu
    openMobileMenu() {
        const mobileMenu = document.querySelector('[data-mobile-menu]');
        const overlay = document.querySelector('[data-mobile-menu-overlay]');
        
        mobileMenu.classList.remove('-translate-x-full');
        mobileMenu.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
    }

    // Close mobile menu
    closeMobileMenu() {
        const mobileMenu = document.querySelector('[data-mobile-menu]');
        const overlay = document.querySelector('[data-mobile-menu-overlay]');
        
        mobileMenu.classList.remove('translate-x-0');
        mobileMenu.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }

    // Load content into the main area
    loadContent(content) {
        const contentArea = document.querySelector('[data-content-area]');
        if (contentArea) {
            contentArea.innerHTML = content;
            this.setupContentFeatures();
        }
    }

    // Set up content-specific features
    setupContentFeatures() {
        // Initialize syntax highlighting
        if (window.hljs) {
            window.hljs.highlightAll();
        }

        // Setup copy code buttons
        this.setupCodeCopyButtons();

        // Setup table of contents
        this.setupTableOfContents();

        // Setup smooth scrolling for anchors
        this.setupSmoothScrolling();

        // Load shared components
        this.loadSharedComponents();

        // Setup image lightbox
        this.setupImageLightbox();
    }

    // Load shared components into placeholders
    async loadSharedComponents() {
        const componentPlaceholders = [
            { id: 'env-file-editing', path: 'content/ecosystem/shared-components/env-file-editing.html' },
            { id: 'apply-env-updates', path: 'content/ecosystem/shared-components/apply-env-updates.html' },
            { id: 'master-wallet-setup', path: 'content/ecosystem/shared-components/master-wallet-setup.html' },
            { id: 'token-management', path: 'content/ecosystem/shared-components/token-management.html' },
            { id: 'security-best-practices', path: 'content/ecosystem/shared-components/security-best-practices.html' }
        ];

        // Load all components in parallel
        const loadPromises = componentPlaceholders.map(async (component) => {
            const element = document.getElementById(component.id);
            if (element) {
                try {
                    const response = await fetch(component.path);
                    if (response.ok) {
                        const content = await response.text();
                        element.innerHTML = content;
                    } else {
                        console.warn(`Failed to load shared component: ${component.path} (${response.status})`);
                        element.innerHTML = '<p class="text-zinc-500 dark:text-zinc-400 italic">Component failed to load</p>';
                    }
                } catch (error) {
                    console.error(`Error loading shared component ${component.path}:`, error);
                    element.innerHTML = '<p class="text-zinc-500 dark:text-zinc-400 italic">Component failed to load</p>';
                }
            }
        });

        await Promise.all(loadPromises);
    }

    // Setup image lightbox functionality
    setupImageLightbox() {
        // Remove any existing lightbox
        const existingLightbox = document.getElementById('image-lightbox');
        if (existingLightbox) {
            existingLightbox.remove();
        }

        // Create lightbox HTML
        const lightboxHTML = `
            <div id="image-lightbox" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 hidden">
                <div class="relative max-w-4xl max-h-full p-4">
                    <img id="lightbox-image" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" src="" alt="">
                    <button id="close-lightbox" class="absolute top-2 right-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Add lightbox to document
        document.body.insertAdjacentHTML('beforeend', lightboxHTML);

        // Get lightbox elements
        const lightbox = document.getElementById('image-lightbox');
        const lightboxImage = document.getElementById('lightbox-image');
        const closeButton = document.getElementById('close-lightbox');

        // Function to open lightbox
        const openLightbox = (imageSrc, imageAlt) => {
            lightboxImage.src = imageSrc;
            lightboxImage.alt = imageAlt || '';
            lightbox.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        };

        // Function to close lightbox
        const closeLightbox = () => {
            lightbox.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scrolling
            lightboxImage.src = '';
        };

        // Add click handlers to all images in content
        const contentImages = document.querySelectorAll('#dynamic-content img, [data-content-area] img');
        contentImages.forEach(img => {
            // Skip images that are already in a link or have no-lightbox class
            if (!img.closest('a') && !img.classList.contains('no-lightbox')) {
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', () => {
                    openLightbox(img.src, img.alt);
                });
            }
        });

        // Close lightbox when clicking outside image or close button
        closeButton.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        // Close lightbox with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) {
                closeLightbox();
            }
        });
    }

    // Add copy buttons to code blocks
    setupCodeCopyButtons() {
        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            const pre = block.parentElement;
            const button = document.createElement('button');
            button.className = 'absolute top-2 right-2 px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity';
            button.textContent = 'Copy';
            
            button.addEventListener('click', () => {
                navigator.clipboard.writeText(block.textContent);
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            });

            pre.style.position = 'relative';
            pre.classList.add('group');
            pre.appendChild(button);
        });
    }

    // Generate table of contents
    setupTableOfContents() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const tocContainer = document.querySelector('[data-table-of-contents]');
        
        if (tocContainer && headings.length > 0) {
            const tocHTML = Array.from(headings).map(heading => {
                const id = heading.id || this.generateId(heading.textContent);
                heading.id = id;
                
                return `
                    <a href="#${id}" 
                       class="block text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 py-1 toc-${heading.tagName.toLowerCase()}"
                       style="padding-left: ${(parseInt(heading.tagName.charAt(1)) - 1) * 12}px">
                        ${heading.textContent}
                    </a>
                `;
            }).join('');
            
            tocContainer.innerHTML = tocHTML;
        }
    }

    // Generate ID from text
    generateId(text) {
        return text.toLowerCase()
                   .replace(/[^\w\s-]/g, '')
                   .replace(/\s+/g, '-')
                   .trim();
    }

    // Setup smooth scrolling
    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Utility: Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Add new navigation section
    addNavigationSection(sectionTitle, items) {
        this.sidebarItems.push({
            title: sectionTitle,
            items: items
        });
        this.refreshSidebar();
    }

    // Add navigation item to existing section
    addNavigationItem(sectionTitle, item) {
        const section = this.sidebarItems.find(s => s.title === sectionTitle);
        if (section) {
            section.items.push(item);
            this.refreshSidebar();
        }
    }

    // Refresh sidebar after navigation changes
    refreshSidebar() {
        const sidebarNav = document.querySelector('[data-sidebar-nav]');
        if (sidebarNav && this.sidebarItems.length > 0) {
            sidebarNav.innerHTML = this.generateSidebarHTML(this.sidebarItems);
        }
    }

    // Set current page for navigation highlighting
    setCurrentPage(page) {
        this.currentPage = page;
        this.updateActiveNavigation();
    }

    // Update active navigation item
    updateActiveNavigation() {
        document.querySelectorAll('[data-sidebar-nav] a').forEach(link => {
            // Remove all active classes
            link.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-900', 'dark:text-blue-100', 'border-l-4', 'border-blue-500', 'pl-2');
            const iconSpan = link.querySelector('span:first-child');
            if (iconSpan) {
                iconSpan.classList.remove('text-blue-600', 'dark:text-blue-400');
            }
            
            // Add active classes if this is the current page
            if (link.getAttribute('href') === this.currentPage) {
                link.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-900', 'dark:text-blue-100', 'border-l-4', 'border-blue-500', 'pl-2');
                if (iconSpan) {
                    iconSpan.classList.add('text-blue-600', 'dark:text-blue-400');
                }
            }
        });
    }

    // Register routes and their content sources
    registerRoutes() {
        this.routes.set('home', {
            title: 'V5 Documentation',
            contentFile: null // This will use default content
        });
        this.routes.set('patch-notes', {
            title: 'Patch Notes',
            contentFile: null, // Dynamic content
            isDynamic: true,
            handler: 'patchNotes'
        });
        this.routes.set('migration-guide', {
            title: 'Migration Guide',
            contentFile: 'content/core/migration-guide.html'
        });
        this.routes.set('server-requirements', {
            title: 'Server Requirements',
            contentFile: 'content/core/server-requirements.html'
        });
        this.routes.set('virtualmin-setup', {
            title: 'Bicrypto Virtualmin Setup',
            contentFile: 'content/core/virtualmin-setup.html'
        });
        this.routes.set('nginx-configuration', {
            title: 'Nginx Configuration',
            contentFile: 'content/core/nginx-configuration.html'
        });
        this.routes.set('app-configuration', {
            title: 'App Configuration',
            contentFile: 'content/core/app-configuration.html'
        });
        this.routes.set('authentication-setup', {
            title: 'Authentication Setup',
            contentFile: 'content/core/authentication-setup.html'
        });
        this.routes.set('email-sms-setup', {
            title: 'Email & SMS Setup',
            contentFile: 'content/core/email-sms-setup.html'
        });
        
        // Payment Gateway routes
        this.routes.set('payment-gateways', {
            title: 'Payment Gateways Overview',
            contentFile: 'content/core/payment-gateways.html'
        });
        this.routes.set('stripe', {
            title: 'Stripe Payment Gateway',
            contentFile: 'content/core/payment-gateways/stripe.html'
        });
        this.routes.set('paypal', {
            title: 'PayPal Payment Gateway',
            contentFile: 'content/core/payment-gateways/paypal.html'
        });
        this.routes.set('payu', {
            title: 'PayU Payment Gateway',
            contentFile: 'content/core/payment-gateways/payu.html'
        });
        this.routes.set('paytm', {
            title: 'Paytm Payment Gateway',
            contentFile: 'content/core/payment-gateways/paytm.html'
        });
        this.routes.set('authorize-net', {
            title: 'Authorize.Net Payment Gateway',
            contentFile: 'content/core/payment-gateways/authorize-net.html'
        });
        this.routes.set('adyen', {
            title: 'Adyen Payment Gateway',
            contentFile: 'content/core/payment-gateways/adyen.html'
        });
        this.routes.set('2checkout', {
            title: '2Checkout Payment Gateway',
            contentFile: 'content/core/payment-gateways/2checkout.html'
        });
        this.routes.set('dlocal', {
            title: 'dLocal Payment Gateway',
            contentFile: 'content/core/payment-gateways/dlocal.html'
        });
        this.routes.set('eway', {
            title: 'eWAY Payment Gateway',
            contentFile: 'content/core/payment-gateways/eway.html'
        });
        this.routes.set('ipay88', {
            title: 'iPay88 Payment Gateway',
            contentFile: 'content/core/payment-gateways/ipay88.html'
        });
        this.routes.set('payfast', {
            title: 'PayFast Payment Gateway',
            contentFile: 'content/core/payment-gateways/payfast.html'
        });
        this.routes.set('mollie', {
            title: 'Mollie Payment Gateway',
            contentFile: 'content/core/payment-gateways/mollie.html'
        });
        this.routes.set('paysafe', {
            title: 'Paysafe Payment Gateway',
            contentFile: 'content/core/payment-gateways/paysafe.html'
        });
        this.routes.set('paystack', {
            title: 'Paystack Payment Gateway',
            contentFile: 'content/core/payment-gateways/paystack.html'
        });
        this.routes.set('klarna', {
            title: 'Klarna Payment Gateway',
            contentFile: 'content/core/payment-gateways/klarna.html'
        });
        this.routes.set('exchange-integration', {
            title: 'Exchange Integration',
            contentFile: 'content/core/exchange-integration.html'
        });
        this.routes.set('ai-configuration', {
            title: 'AI Configuration',
            contentFile: 'content/core/ai-configuration.html'
        });
        this.routes.set('dbeaver-setup', {
            title: 'DBeaver Setup for ScyllaDB',
            contentFile: 'content/ecosystem/dbeaver-setup.html'
        });
        this.routes.set('ecosystem-installation', {
            title: 'Ecosystem Installation',
            contentFile: 'content/ecosystem/installation.html'
        });
        this.routes.set('ecosystem-master-wallet', {
            title: 'Master Wallet Configuration',
            contentFile: 'content/ecosystem/master-wallet.html'
        });
        this.routes.set('ecosystem-custodial-wallets', {
            title: 'Custodial Wallets Management',
            contentFile: 'content/ecosystem/custodial-wallets.html'
        });
        this.routes.set('ecosystem-token-management', {
            title: 'Token Management',
            contentFile: 'content/ecosystem/token-management.html'
        });
        this.routes.set('ecosystem-token-types', {
            title: 'Token Types Overview',
            contentFile: 'content/ecosystem/token-types.html'
        });
        this.routes.set('ecosystem-markets', {
            title: 'Ecosystem Markets',
            contentFile: 'content/ecosystem/markets.html'
        });
        
        // AI Investment routes
        this.routes.set('ai-investment-installation', {
            title: 'AI Investment - Installation Guide',
            contentFile: 'content/ai-investment/installation.html'
        });
        this.routes.set('ai-investment-plans', {
            title: 'AI Investment - Plans Management',
            contentFile: 'content/ai-investment/plans.html'
        });
        this.routes.set('ai-investment-durations', {
            title: 'AI Investment - Duration Configuration',
            contentFile: 'content/ai-investment/durations.html'
        });

        
        // Ecommerce routes
        this.routes.set('ecommerce-installation', {
            title: 'Ecommerce - Installation Guide',
            contentFile: 'content/ecommerce/installation.html'
        });
        this.routes.set('ecommerce-products', {
            title: 'Ecommerce - Product Management',
            contentFile: 'content/ecommerce/products.html'
        });
        this.routes.set('ecommerce-orders', {
            title: 'Ecommerce - Order Management',
            contentFile: 'content/ecommerce/orders.html'
        });
        this.routes.set('ecommerce-settings', {
            title: 'Ecommerce - Settings & Configuration',
            contentFile: 'content/ecommerce/settings.html'
        });

        
        // FAQ routes
        this.routes.set('faq-installation', {
            title: 'FAQ System - Installation Guide',
            contentFile: 'content/faq/installation.html'
        });
        this.routes.set('faq-categories', {
            title: 'FAQ System - Category Management',
            contentFile: 'content/faq/categories.html'
        });
        this.routes.set('faq-questions', {
            title: 'FAQ System - Question Management',
            contentFile: 'content/faq/questions.html'
        });
        this.routes.set('faq-ai-integration', {
            title: 'FAQ System - AI Integration',
            contentFile: 'content/faq/ai-integration.html'
        });

        
        // Forex routes
        this.routes.set('forex-installation', {
            title: 'Forex - Installation Guide',
            contentFile: 'content/forex/installation.html'
        });
        this.routes.set('forex-plans', {
            title: 'Forex - Plan Management',
            contentFile: 'content/forex/plans.html'
        });
        this.routes.set('forex-investments', {
            title: 'Forex - Investment Tracking',
            contentFile: 'content/forex/investments.html'
        });
        this.routes.set('forex-signals', {
            title: 'Forex - Trading Signals',
            contentFile: 'content/forex/signals.html'
        });
        this.routes.set('forex-accounts', {
            title: 'Forex - Account Management',
            contentFile: 'content/forex/accounts.html'
        });

        
        // Futures routes
        this.routes.set('futures-installation', {
            title: 'Futures - Installation Guide',
            contentFile: 'content/futures/installation.html'
        });
        this.routes.set('futures-markets', {
            title: 'Futures - Market Management',
            contentFile: 'content/futures/markets.html'
        });
        this.routes.set('futures-positions', {
            title: 'Futures - Position Tracking',
            contentFile: 'content/futures/positions.html'
        });
        this.routes.set('futures-orders', {
            title: 'Futures - Order Management',
            contentFile: 'content/futures/orders.html'
        });

        
        // ICO routes
        this.routes.set('ico-installation', {
            title: 'ICO - Installation Guide',
            contentFile: 'content/ico/installation.html'
        });
        this.routes.set('ico-offers', {
            title: 'ICO - Offer Management',
            contentFile: 'content/ico/offers.html'
        });
        this.routes.set('ico-transactions', {
            title: 'ICO - Transaction Tracking',
            contentFile: 'content/ico/transactions.html'
        });
        this.routes.set('ico-settings', {
            title: 'ICO - Settings & Configuration',
            contentFile: 'content/ico/settings.html'
        });

        
        // MailWizard routes
        this.routes.set('mailwizard-installation', {
            title: 'MailWizard - Installation Guide',
            contentFile: 'content/mailwizard/installation.html'
        });
        this.routes.set('mailwizard-templates', {
            title: 'MailWizard - Template Management',
            contentFile: 'content/mailwizard/templates.html'
        });
        this.routes.set('mailwizard-campaigns', {
            title: 'MailWizard - Campaign Management',
            contentFile: 'content/mailwizard/campaigns.html'
        });
        this.routes.set('mailwizard-settings', {
            title: 'MailWizard - Settings & Configuration',
            contentFile: 'content/mailwizard/settings.html'
        });

        
        // Affiliate routes
        this.routes.set('affiliate-installation', {
            title: 'Affiliate - Installation Guide',
            contentFile: 'content/affiliate/installation.html'
        });
        this.routes.set('affiliate-user-features', {
            title: 'Affiliate - User Features',
            contentFile: 'content/affiliate/user-features.html'
        });
        this.routes.set('affiliate-admin-management', {
            title: 'Affiliate - Admin Management',
            contentFile: 'content/affiliate/admin-management.html'
        });

        
        // P2P routes
        this.routes.set('p2p-installation', {
            title: 'P2P Trading - Installation Guide',
            contentFile: 'content/p2p/installation.html'
        });
        this.routes.set('p2p-offers', {
            title: 'P2P Trading - Offer Management',
            contentFile: 'content/p2p/offers.html'
        });
        this.routes.set('p2p-trades', {
            title: 'P2P Trading - Trade Management',
            contentFile: 'content/p2p/trades.html'
        });
        this.routes.set('p2p-disputes', {
            title: 'P2P Trading - Dispute Resolution',
            contentFile: 'content/p2p/disputes.html'
        });

        
        // Staking Extension Routes
        this.routes.set('staking-installation', {
            title: 'Staking - Installation',
            contentFile: 'content/staking/installation.html'
        });
        this.routes.set('staking-pools', {
            title: 'Staking - Pool Management',
            contentFile: 'content/staking/pools.html'
        });
        this.routes.set('staking-positions', {
            title: 'Staking - Position Management',
            contentFile: 'content/staking/positions.html'
        });
        this.routes.set('staking-rewards', {
            title: 'Staking - Rewards & Earnings',
            contentFile: 'content/staking/rewards.html'
        });

        
        this.routes.set('blockchain-ethereum', {
            title: 'Ethereum Integration',
            contentFile: 'content/ecosystem/blockchain/ethereum.html'
        });
        this.routes.set('blockchain-base', {
            title: 'Base Network Integration',
            contentFile: 'content/ecosystem/blockchain/base.html'
        });
        this.routes.set('blockchain-ton', {
            title: 'TON Integration',
            contentFile: 'content/ecosystem/blockchain/ton.html'
        });
        this.routes.set('blockchain-tron', {
            title: 'Tron Integration',
            contentFile: 'content/ecosystem/blockchain/tron.html'
        });
        this.routes.set('blockchain-bsc', {
            title: 'Binance Smart Chain Integration',
            contentFile: 'content/ecosystem/blockchain/bsc.html'
        });
        this.routes.set('blockchain-polygon', {
            title: 'Polygon Integration',
            contentFile: 'content/ecosystem/blockchain/polygon.html'
        });
        this.routes.set('blockchain-fantom', {
            title: 'Fantom Integration',
            contentFile: 'content/ecosystem/blockchain/fantom.html'
        });
        this.routes.set('blockchain-optimism', {
            title: 'Optimism Integration',
            contentFile: 'content/ecosystem/blockchain/optimism.html'
        });
        this.routes.set('blockchain-arbitrum', {
            title: 'Arbitrum Integration',
            contentFile: 'content/ecosystem/blockchain/arbitrum.html'
        });
        this.routes.set('blockchain-celo', {
            title: 'Celo Integration',
            contentFile: 'content/ecosystem/blockchain/celo.html'
        });
        this.routes.set('blockchain-monero', {
            title: 'Monero Integration',
            contentFile: 'content/ecosystem/blockchain/monero.html'
        });
        this.routes.set('blockchain-utxo', {
            title: 'UTXO Networks Integration',
            contentFile: 'content/ecosystem/blockchain/utxo.html'
        });
        this.routes.set('blockchain-solana', {
            title: 'Solana Integration',
            contentFile: 'content/ecosystem/blockchain/solana.html'
        });
    }

    // Setup client-side routing
    setupRouting() {
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // Handle direct navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                e.preventDefault();
                const hash = link.getAttribute('href');
                window.location.hash = hash;
            }
        });
    }

    // Handle initial route on page load
    handleInitialRoute() {
        const hash = window.location.hash;
        if (hash) {
            this.handleRouteChange();
        } else {
            // Default to home
            this.setCurrentPage('#home');
            this.loadDefaultContent();
        }
    }

    // Handle route changes
    handleRouteChange() {
        const hash = window.location.hash.slice(1); // Remove #
        const route = this.routes.get(hash);
        
        if (route) {
            this.setCurrentPage(`#${hash}`);
            this.loadRouteContent(route);
            this.updateActiveNavigation();
            
            // Close mobile menu if open
            const sidebarOpenElement = document.querySelector('[x-data]');
            if (sidebarOpenElement && sidebarOpenElement.__x && sidebarOpenElement.__x.$data.sidebarOpen) {
                sidebarOpenElement.__x.$data.sidebarOpen = false;
            }
        } else {
            // Route not found, redirect to home
            window.location.hash = '#home';
        }
    }

    // Load content for a route
    async loadRouteContent(route) {
        if (this.isLoading) return;
        
        this.showLoading();
        
        try {
            if (route.isDynamic && route.handler) {
                // Handle dynamic routes
                await this.handleDynamicRoute(route);
            } else if (route.contentFile) {
                const response = await fetch(route.contentFile);
                if (response.ok) {
                    const content = await response.text();
                    this.updateMainContent(content);
                } else {
                    throw new Error(`Failed to load content: ${response.status}`);
                }
            } else {
                this.loadDefaultContent();
            }
            
            // Update page title
            document.title = `${route.title} - V5 Documentation`;
            
        } catch (error) {
            console.error('Error loading content:', error);
            this.showError('Failed to load content. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    // Handle dynamic routes
    async handleDynamicRoute(route) {
        switch (route.handler) {
            case 'patchNotes':
                await this.loadPatchNotesContent();
                break;
            default:
                throw new Error(`Unknown dynamic route handler: ${route.handler}`);
        }
    }

    // Load patch notes content dynamically
    async loadPatchNotesContent() {
        try {
            // Initialize patch notes system with lazy loading if not already done
            if (!window.patchNotesSystem) {
                window.patchNotesSystem = new PatchNotesSystem();
                // Store global instance for toggle function access
                window.patchNotesSystemInstance = window.patchNotesSystem;
                window.patchNotesSystem.init(); // Synchronous initialization, background loading
            }
            
            // Generate and display patch notes HTML (structure only, content loads lazily)
            const patchNotesHTML = window.patchNotesSystem.generatePatchNotesHTML();
            this.updateMainContent(patchNotesHTML);
            
        } catch (error) {
            console.error('Error loading patch notes:', error);
            throw new Error('Failed to load patch notes content');
        }
    }

    // Update the content area
    updateMainContent(content) {
        const contentArea = document.getElementById('dynamic-content') || document.querySelector('[data-content-area]');
        if (contentArea) {
            contentArea.innerHTML = content;
            this.setupContentFeatures();
            // Scroll to top
            window.scrollTo(0, 0);
        }
    }

    // Show loading indicator
    showLoading() {
        this.isLoading = true;
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
        
        const contentArea = document.getElementById('dynamic-content') || document.querySelector('[data-content-area]');
        if (contentArea) {
            contentArea.style.opacity = '0.5';
        }
    }

    // Hide loading indicator
    hideLoading() {
        this.isLoading = false;
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
        
        const contentArea = document.getElementById('dynamic-content') || document.querySelector('[data-content-area]');
        if (contentArea) {
            contentArea.style.opacity = '1';
        }
    }

    // Show error message
    showError(message) {
        const contentArea = document.getElementById('dynamic-content') || document.querySelector('[data-content-area]');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                        <div class="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                        </div>
                        <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Error Loading Content</h3>
                        <p class="text-zinc-600 dark:text-zinc-400 mb-4">${message}</p>
                        <button onclick="window.location.reload()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                            Reload Page
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Load default home content
    loadDefaultContent() {
        const defaultContent = `
            <div class="mb-8">
                <div class="flex items-center mb-4">
                    <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-4">
                        <span class="text-2xl">📖</span>
                    </div>
                    <div>
                        <h1 class="text-4xl font-bold text-zinc-900 dark:text-zinc-100">V5 Documentation</h1>
                        <p class="text-zinc-600 dark:text-zinc-400">Complete setup and configuration guide for your cryptocurrency trading platform</p>
                    </div>
                </div>
                
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span class="text-blue-900 dark:text-blue-100 font-medium">Need Help?</span>
                    </div>
                    <p class="text-blue-800 dark:text-blue-200 mt-1">
                        For additional support, visit our 
                        <a href="https://support.mashdiv.com" target="_blank" class="font-semibold underline hover:no-underline">Support Center</a>
                    </p>
                </div>
            </div>

            <div class="mb-12">
                <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">Quick Start Guide</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-xl">🏠</span>
                            </div>
                            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">App Configuration</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 mb-4">Configure core application settings, database, and basic features.</p>
                        <a href="#app-configuration" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                            Get Started
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-xl">🔐</span>
                            </div>
                            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Authentication</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 mb-4">Set up Google OAuth, 2FA, reCAPTCHA, and security features.</p>
                        <a href="#authentication-setup" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                            Configure Security
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-xl">💳</span>
                            </div>
                            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Payment Gateways</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 mb-4">Integrate Stripe, PayPal, PayStack, and crypto payments.</p>
                        <a href="#payment-gateways" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                            Setup Payments
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-xl">🏛️</span>
                            </div>
                            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Exchange APIs</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 mb-4">Connect to KuCoin, Binance, XT, Kraken, and other exchanges.</p>
                        <a href="#exchange-integration" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                            Connect Exchanges
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-xl">📧</span>
                            </div>
                            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Email & SMS</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 mb-4">Configure SMTP, SendGrid, Twilio for notifications.</p>
                        <a href="#email-sms-setup" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                            Setup Communications
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-xl">🤖</span>
                            </div>
                            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI Features</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 mb-4">Setup OpenAI, DeepSeek, Gemini for AI-powered features.</p>
                        <a href="#ai-configuration" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                            Configure AI
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-xl">🌟</span>
                            </div>
                            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Ecosystem</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 mb-4">Setup blockchain wallets, tokens, and multi-chain support.</p>
                        <a href="#ecosystem-installation" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                            Setup Ecosystem
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-4">
                            <div class="w-10 h-10 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-xl">🛒</span>
                            </div>
                            <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Ecommerce</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 mb-4">Create an online store with product management and orders.</p>
                        <a href="#ecommerce-installation" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                            Setup Store
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            <div class="mb-12">
                <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">Popular Extensions</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-600">
                        <div class="flex items-center mb-3">
                            <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-lg">🪙</span>
                            </div>
                            <h3 class="text-md font-semibold text-zinc-900 dark:text-zinc-100">ICO</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-3">Launch token sales and manage ICO campaigns.</p>
                        <a href="#ico-installation" class="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium">
                            Install →
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-3">
                            <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-lg">💰</span>
                            </div>
                            <h3 class="text-md font-semibold text-zinc-900 dark:text-zinc-100">Staking</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-3">Cryptocurrency staking pools and rewards.</p>
                        <a href="#staking-installation" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
                            Install →
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-emerald-300 dark:hover:border-emerald-600">
                        <div class="flex items-center mb-3">
                            <div class="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-lg">📈</span>
                            </div>
                            <h3 class="text-md font-semibold text-zinc-900 dark:text-zinc-100">Forex</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-3">Forex trading and investment management.</p>
                        <a href="#forex-installation" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium">
                            Install →
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-orange-300 dark:hover:border-orange-600">
                        <div class="flex items-center mb-3">
                            <div class="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-lg">⚡</span>
                            </div>
                            <h3 class="text-md font-semibold text-zinc-900 dark:text-zinc-100">Futures</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-3">Advanced futures trading with leverage.</p>
                        <a href="#futures-installation" class="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium">
                            Install →
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-green-300 dark:hover:border-green-600">
                        <div class="flex items-center mb-3">
                            <div class="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-lg">🤝</span>
                            </div>
                            <h3 class="text-md font-semibold text-zinc-900 dark:text-zinc-100">P2P Trading</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-3">Peer-to-peer trading marketplace.</p>
                        <a href="#p2p-installation" class="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium">
                            Install →
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                        <div class="flex items-center mb-3">
                            <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-lg">📧</span>
                            </div>
                            <h3 class="text-md font-semibold text-zinc-900 dark:text-zinc-100">MailWizard</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-3">Email marketing and automation system.</p>
                        <a href="#mailwizard-installation" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
                            Install →
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-600">
                        <div class="flex items-center mb-3">
                            <div class="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-lg">❓</span>
                            </div>
                            <h3 class="text-md font-semibold text-zinc-900 dark:text-zinc-100">FAQ System</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-3">AI-powered knowledge base and support.</p>
                        <a href="#faq-installation" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium">
                            Install →
                        </a>
                    </div>

                    <div class="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-violet-300 dark:hover:border-violet-600">
                        <div class="flex items-center mb-3">
                            <div class="w-8 h-8 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center mr-3">
                                <span class="text-lg">🤖</span>
                            </div>
                            <h3 class="text-md font-semibold text-zinc-900 dark:text-zinc-100">AI Investment</h3>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-3">AI-driven investment plans and automation.</p>
                        <a href="#ai-investment-installation" class="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-sm font-medium">
                            Install →
                        </a>
                    </div>
                </div>
                
                <div class="mt-6 text-center">
                    <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
                        Explore all available extensions to enhance your trading platform
                    </p>
                    <a href="#patch-notes" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        View Latest Updates
                        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </a>
                </div>
            </div>

            <div class="mb-12">
                <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">Getting Started</h2>
                
                <div class="space-y-4">
                    <div class="flex items-start">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-4">1</div>
                        <div>
                            <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100">Server Setup</h3>
                            <p class="text-zinc-600 dark:text-zinc-400">Install Bicrypto on your server using our Virtualmin setup guide or manual installation.</p>
                            <div class="mt-2 flex gap-2">
                                <a href="#virtualmin-setup" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">Virtualmin Setup →</a>
                                <a href="#nginx-configuration" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">Nginx Config →</a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-start">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-4">2</div>
                        <div>
                            <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100">Core Configuration</h3>
                            <p class="text-zinc-600 dark:text-zinc-400">Configure your application settings, database, and essential features.</p>
                            <div class="mt-2 flex gap-2">
                                <a href="#app-configuration" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">App Config →</a>
                                <a href="#authentication-setup" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">Auth Setup →</a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-start">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-4">3</div>
                        <div>
                            <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100">Payments & Exchanges</h3>
                            <p class="text-zinc-600 dark:text-zinc-400">Connect payment gateways and cryptocurrency exchanges for trading functionality.</p>
                            <div class="mt-2 flex gap-2">
                                <a href="#payment-gateways" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">Payments →</a>
                                <a href="#exchange-integration" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">Exchanges →</a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-start">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-4">4</div>
                        <div>
                            <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100">Install Extensions</h3>
                            <p class="text-zinc-600 dark:text-zinc-400">Add powerful features like ICO, Staking, P2P Trading, and more to enhance your platform.</p>
                            <div class="mt-2 flex gap-2">
                                <a href="#ecosystem-installation" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">Ecosystem →</a>
                                <a href="#ico-installation" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">ICO →</a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-start">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-4">5</div>
                        <div>
                            <h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100">Advanced Features</h3>
                            <p class="text-zinc-600 dark:text-zinc-400">Setup AI features, email automation, and advanced trading tools for a complete platform.</p>
                            <div class="mt-2 flex gap-2">
                                <a href="#ai-configuration" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">AI Config →</a>
                                <a href="#mailwizard-installation" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">Email →</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.updateMainContent(defaultContent);
    }

    // Load sidebar states from localStorage
    loadSidebarStates() {
        try {
            const saved = localStorage.getItem('bicrypto-sidebar-states');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.warn('Failed to load sidebar states from localStorage:', error);
            return {};
        }
    }

    // Save sidebar states to localStorage
    saveSidebarStates() {
        try {
            localStorage.setItem('bicrypto-sidebar-states', JSON.stringify(this.sidebarStates));
        } catch (error) {
            console.warn('Failed to save sidebar states to localStorage:', error);
        }
    }

    // Toggle sidebar section and persist state
    toggleSidebarSection(sectionTitle, buttonElement) {
        const sectionContainer = buttonElement.closest('[data-section-id]');
        const contentElement = sectionContainer.querySelector('[data-section-content]');
        const chevronElement = buttonElement.querySelector('[data-chevron]');
        
        if (contentElement && chevronElement) {
            const isCurrentlyHidden = contentElement.classList.contains('hidden');
            
            // Toggle visibility
            contentElement.classList.toggle('hidden');
            chevronElement.classList.toggle('rotate-180');
            
            // Update state (true = collapsed/hidden, false = expanded/visible)
            this.sidebarStates[sectionTitle] = !isCurrentlyHidden;
            
            // Save to localStorage
            this.saveSidebarStates();
        }
    }

    // Toggle sidebar group (nested items) and persist state
    toggleSidebarGroup(groupId, buttonElement) {
        const groupContainer = buttonElement.closest('[data-group-id]');
        const contentElement = groupContainer.querySelector('[data-group-content]');
        const chevronElement = buttonElement.querySelector('[data-chevron]');
        
        if (contentElement && chevronElement) {
            const isCurrentlyHidden = contentElement.classList.contains('hidden');
            
            // Toggle visibility
            contentElement.classList.toggle('hidden');
            chevronElement.classList.toggle('rotate-180');
            
            // Update state (true = collapsed/hidden, false = expanded/visible)
            this.sidebarStates[groupId] = !isCurrentlyHidden;
            
            // Save to localStorage
            this.saveSidebarStates();
        }
    }

    // Improved theme management
    initTheme() {
        // Load theme from localStorage or system preference
        const savedTheme = localStorage.getItem('bicrypto-theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let isDarkMode = false;
        if (savedTheme) {
            isDarkMode = savedTheme === 'dark';
        } else {
            isDarkMode = systemPrefersDark;
        }
        
        this.applyTheme(isDarkMode ? 'dark' : 'light');
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('bicrypto-theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // Apply theme and save to localStorage (override existing method)
    applyTheme(theme) {
        try {
            localStorage.setItem('bicrypto-theme', theme);
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } catch (error) {
            console.warn('Failed to save theme to localStorage:', error);
            // Fallback to just applying the theme without saving
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }

    // Toggle theme (override existing method)
    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        this.applyTheme(isDark ? 'light' : 'dark');
    }

    // Generate cache-busting URL
    getCacheBustedUrl(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${this.cacheVersion}&t=${Date.now()}`;
    }

    // Force page reload with cache bypass
    forceReload() {
        // Clear all caches
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        
        // Hard reload
        window.location.reload(true);
    }
}

// Export for use in other files
window.DocsLayout = DocsLayout; 