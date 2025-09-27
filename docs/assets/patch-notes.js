// Patch Notes System for Documentation
class PatchNotesSystem {
    constructor() {
        this.patchNotes = new Map();
        this.cacheVersion = '1.0.030259'; // Update this when deploying changes
        this.extensionIcons = {
            core: '🚀',
            ai: '🤖',
            affiliate: '💰',
            ecommerce: '🛒',
            ecosystem: '🌟',
            faq: '❓',
            forex: '📈',
            futures: '⚡',
            ico: '🪙',
            mailwizard: '📧',
            p2p: '🤝',
            payment: '💳',
            staking: '💎'
        };
        this.extensionColors = {
            core: 'from-blue-500 to-purple-600',
            ai: 'from-purple-500 to-pink-600',
            affiliate: 'from-green-500 to-emerald-600',
            ecommerce: 'from-orange-500 to-red-600',
            ecosystem: 'from-yellow-500 to-orange-600',
            faq: 'from-cyan-500 to-blue-600',
            forex: 'from-indigo-500 to-purple-600',
            futures: 'from-pink-500 to-rose-600',
            ico: 'from-emerald-500 to-teal-600',
            mailwizard: 'from-blue-500 to-indigo-600',
            p2p: 'from-teal-500 to-cyan-600',
            payment: 'from-violet-500 to-purple-600',
            staking: 'from-rose-500 to-pink-600'
        };
    }

    // Initialize patch notes system (non-blocking)
    init() {
        try {
            // Load structure synchronously (fast, no await)
            this.loadPatchNotesStructure();
            return true;
        } catch (error) {
            console.error('Failed to initialize patch notes system:', error);
            return false;
        }
    }

    // Load patch notes structure without content (synchronous, for immediate display)
    loadPatchNotesStructure() {
        const contentTypes = [
            'core', 'ai', 'affiliate', 'ecommerce', 'ecosystem', 
            'faq', 'forex', 'futures', 'ico', 'mailwizard', 
            'p2p', 'payment', 'staking'
        ];

        // Create structure immediately without loading content
        for (const type of contentTypes) {
            try {
                this.createEmptyStructureForType(type);
            } catch (error) {
                console.warn(`Failed to create structure for ${type}:`, error);
            }
        }

        // Start background loading after page is fully loaded
        this.scheduleBackgroundLoading();
    }

    // Create empty structure for immediate display (synchronous)
    createEmptyStructureForType(type) {
        const versions = this.getKnownVersionsForType(type);
        
        if (versions.length === 0) {
            return;
        }

        const typeData = {
            type,
            versions: []
        };

        // Create version entries without content (for lazy loading)
        for (const version of versions) {
            typeData.versions.push({
                version,
                content: null, // Will be loaded lazily
                metadata: null, // Will be loaded lazily
                isLoading: false,
                isLoaded: false
            });
        }

        // Sort versions by semantic version (newest first)
        typeData.versions.sort((a, b) => this.compareVersions(b.version, a.version));

        this.patchNotes.set(type, typeData);
    }

    // Schedule background loading after page is fully loaded
    scheduleBackgroundLoading() {
        const startBackgroundLoading = () => {
            console.log('🔄 Starting background patch notes loading...');
            setTimeout(() => {
                this.startGlobalLazyLoading();
            }, 500); // Small delay to ensure page is fully rendered
        };

        if (document.readyState === 'complete') {
            startBackgroundLoading();
        } else {
            window.addEventListener('load', startBackgroundLoading);
        }
    }

    // Start lazy loading for all types (background process)
    async startGlobalLazyLoading() {
        const contentTypes = [
            'core', 'ai', 'affiliate', 'ecommerce', 'ecosystem', 
            'faq', 'forex', 'futures', 'ico', 'mailwizard', 
            'p2p', 'payment', 'staking'
        ];

        for (const type of contentTypes) {
            const typeData = this.patchNotes.get(type);
            if (typeData && typeData.versions.length > 0) {
                // Start lazy loading for this type (non-blocking)
                this.startLazyLoading(type, typeData);
            }
        }
    }

    // Load all patch notes content (legacy method for backward compatibility)
    async loadAllPatchNotes() {
        const contentTypes = [
            'core', 'ai', 'affiliate', 'ecommerce', 'ecosystem', 
            'faq', 'forex', 'futures', 'ico', 'mailwizard', 
            'p2p', 'payment', 'staking'
        ];

        for (const type of contentTypes) {
            try {
                await this.loadPatchNotesForType(type);
            } catch (error) {
                console.warn(`Failed to load patch notes for ${type}:`, error);
                // Continue loading other types even if one fails
            }
        }
    }

    // Load patch notes structure for a specific type (without content)
    async loadPatchNotesStructureForType(type) {
        try {
            const versions = await this.discoverVersionFiles(type);
            
            if (versions.length === 0) {
                return;
            }

            const typeData = {
                type,
                versions: []
            };

            // Create version entries without content (for lazy loading)
            for (const version of versions) {
                typeData.versions.push({
                    version,
                    content: null, // Will be loaded lazily
                    metadata: null, // Will be loaded lazily
                    isLoading: false,
                    isLoaded: false
                });
            }

            // Sort versions by semantic version (newest first)
            typeData.versions.sort((a, b) => this.compareVersions(b.version, a.version));

            if (typeData.versions.length > 0) {
                this.patchNotes.set(type, typeData);
                // Start lazy loading content from newest to oldest
                this.startLazyLoading(type, typeData);
            }
        } catch (error) {
            console.warn(`Failed to load patch notes structure for type ${type}:`, error);
        }
    }

    // Load patch notes for a specific type (core or extension) - Full loading
    async loadPatchNotesForType(type) {
        try {
            // Try to load patch notes directory listing
            const patchNotesPath = `content/${type}/patch-notes/`;
            const versions = await this.discoverVersionFiles(type);
            
            if (versions.length === 0) {
                return;
            }

            const typeData = {
                type,
                versions: []
            };

            // Load each version file
            for (const version of versions) {
                try {
                    const content = await this.loadVersionFile(type, version);
                    if (content) {
                        typeData.versions.push({
                            version,
                            content,
                            metadata: this.parseMetadata(content),
                            isLoading: false,
                            isLoaded: true
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to load version ${version} for ${type}:`, error);
                }
            }

            // Sort versions by semantic version (newest first)
            typeData.versions.sort((a, b) => this.compareVersions(b.version, a.version));

            if (typeData.versions.length > 0) {
                this.patchNotes.set(type, typeData);
            }
        } catch (error) {
            console.warn(`Failed to load patch notes for type ${type}:`, error);
        }
    }

    // Discover version files for a type (simulate directory listing)
    async discoverVersionFiles(type) {
        // Check if we're running in file:// protocol (local file access)
        const isFileProtocol = window.location.protocol === 'file:';
        
        if (isFileProtocol) {
            // For file:// protocol, return known versions based on type
            return this.getKnownVersionsForType(type);
        }
        
        // For HTTP/HTTPS, try to discover files dynamically
        // IMPORTANT: Update this list when new versions are expected
        // Each extension type has its own specific versions
        const typeSpecificVersions = this.getKnownVersionsForType(type);

        const existingVersions = [];
        
        for (const version of typeSpecificVersions) {
            try {
                const response = await fetch(`content/${type}/patch-notes/${version}.md`);
                if (response.ok) {
                    existingVersions.push(version);
                }
            } catch (error) {
                // File doesn't exist, continue
            }
        }

        return existingVersions;
    }

    // Get known versions for each type (for file:// protocol)
    // IMPORTANT: Update this list when new patch notes files are created
    getKnownVersionsForType(type) {
        const knownVersions = {
            'core': ['5.0.0', '5.0.8', '5.0.9', '5.1.1', '5.1.3', '5.1.4', '5.1.5', '5.1.6', '5.1.7', '5.1.8', '5.2.0', '5.2.1', '5.2.2', '5.2.4', '5.2.5', '5.2.6', '5.2.7', '5.2.8', '5.2.9', '5.3.0', '5.3.1', '5.3.2', '5.3.3', '5.3.4', '5.3.5', '5.3.6', '5.3.7', '5.3.8', '5.4.0', '5.4.1', '5.4.2', '5.4.3', '5.4.4', '5.4.5', '5.4.6', '5.4.7', '5.4.8', '5.4.9'],
            'staking': ['5.0.3', '5.0.7', '5.0.9', '5.1.3'],
            'p2p': ['5.0.0', '5.0.4', '5.0.5', '5.0.6', '5.0.7', '5.0.8', '5.1.2', '5.1.3', '5.1.7', '5.1.8', '5.2.1'],
            'ecommerce': ['5.0.3', '5.0.4', '5.0.5', '5.0.6', '5.0.7', '5.0.8', '5.1.1'],
            'ai': [],
            'affiliate': ['5.0.5', '5.0.6'],
            'ecosystem': ['5.0.5', '5.1.1', '5.1.6'],
            'faq': ['5.0.6', '5.0.7'],
            'forex': ['5.0.3', '5.0.4', '5.0.5', '5.0.6', '5.1.1'],
            'futures': ['5.0.4'],
            'ico': ['5.0.1', '5.1.4'],
            'mailwizard': [],
            'payment': []
        };
        
        return knownVersions[type] || [];
    }

    // Update global loading progress
    updateGlobalProgress() {
        const progressBar = document.getElementById('loading-progress-bar');
        const statusElement = document.getElementById('loading-status');
        const progressContainer = document.getElementById('patch-notes-progress');
        
        if (!progressBar || !statusElement || !progressContainer) return;
        
        let totalVersions = 0;
        let loadedVersions = 0;
        let loadingVersions = 0;
        
        // Count all versions across all types
        for (const [type, typeData] of this.patchNotes) {
            totalVersions += typeData.versions.length;
            for (const version of typeData.versions) {
                if (version.isLoaded) {
                    loadedVersions++;
                } else if (version.isLoading) {
                    loadingVersions++;
                }
            }
        }
        
        const progress = totalVersions > 0 ? (loadedVersions / totalVersions) * 100 : 0;
        
        // Update progress bar
        progressBar.style.width = `${progress}%`;
        
        // Update status text
        if (loadedVersions === totalVersions) {
            statusElement.textContent = `Complete! ${loadedVersions} versions loaded`;
            // Hide progress bar after a delay
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.style.opacity = '0';
                    progressContainer.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                    }, 300);
                }
            }, 1000);
        } else if (loadingVersions > 0) {
            statusElement.textContent = `Loading... ${loadedVersions}/${totalVersions} versions (${loadingVersions} in progress)`;
        } else {
            statusElement.textContent = `${loadedVersions}/${totalVersions} versions loaded`;
        }
    }

    // Start lazy loading content from newest to oldest with concurrency
    async startLazyLoading(type, typeData) {
        const maxConcurrent = 3; // Load up to 3 versions concurrently
        let currentIndex = 0;
        
        // Update global progress
        this.updateGlobalProgress();
        
        const loadNextBatch = async () => {
            const batch = [];
            
            // Create a batch of versions to load
            for (let i = 0; i < maxConcurrent && currentIndex < typeData.versions.length; i++) {
                const versionData = typeData.versions[currentIndex];
                if (!versionData.isLoaded && !versionData.isLoading) {
                    batch.push({ versionData, index: currentIndex });
                    currentIndex++;
                }
            }
            
            if (batch.length === 0) {
                // No more versions to load, update progress one final time
                this.updateGlobalProgress();
                return;
            }
            
            // Load batch concurrently
            const loadPromises = batch.map(async ({ versionData, index }) => {
                try {
                    versionData.isLoading = true;
                    this.updateVersionUI(type, versionData.version, 'loading');
                    
                    const content = await this.loadVersionFile(type, versionData.version);
                    
                    // Always mark as loaded, even with fallback content
                    versionData.content = content;
                    versionData.metadata = this.parseMetadata(content);
                    versionData.isLoaded = true;
                    versionData.isLoading = false;
                    
                    // Update UI to show loaded state
                    this.updateVersionUI(type, versionData.version, 'loaded');
                    
                    // Also regenerate the version entry to ensure proper display
                    this.refreshVersionEntry(type, versionData);
                    
                } catch (error) {
                    console.warn(`Failed to lazy load ${type}/${versionData.version}:`, error);
                    
                    // Even on error, provide fallback content and mark as loaded
                    versionData.content = this.getFallbackContent(type, versionData.version);
                    versionData.metadata = this.parseMetadata(versionData.content);
                    versionData.isLoaded = true;
                    versionData.isLoading = false;
                    
                    this.updateVersionUI(type, versionData.version, 'loaded');
                    this.refreshVersionEntry(type, versionData);
                }
            });
            
            await Promise.all(loadPromises);
            
            // Update global progress after batch completion
            this.updateGlobalProgress();
            
            // Load next batch if there are more versions
            if (currentIndex < typeData.versions.length) {
                // Small delay to prevent overwhelming the browser
                setTimeout(() => loadNextBatch(), 100);
            }
        };
        
        // Start loading
        loadNextBatch();
    }

    // Update version UI based on loading state
    updateVersionUI(type, version, state) {
        const uniqueId = `${type}-${version.replace(/\./g, '-')}`;
        const button = document.querySelector(`[onclick="togglePatchNoteVersion('${uniqueId}')"]`);
        const content = document.getElementById(`content-${uniqueId}`);
        
        if (!button) {
            console.warn(`Button not found for ${uniqueId}`);
            return;
        }
        
        const loadingIndicator = button.querySelector('.loading-indicator');
        const chevron = button.querySelector('svg');
        const tagsContainer = button.querySelector('.flex.flex-wrap.gap-1');
        
        switch (state) {
            case 'loading':
                if (!loadingIndicator) {
                    const spinner = document.createElement('div');
                    spinner.className = 'loading-indicator inline-flex items-center';
                    spinner.innerHTML = `
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span class="text-xs text-zinc-500">Loading...</span>
                    `;
                    button.appendChild(spinner);
                }
                if (chevron) chevron.style.opacity = '0.3';
                break;
                
            case 'loaded':
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                if (chevron) chevron.style.opacity = '1';
                button.classList.remove('opacity-50');
                
                // Update tags if they were loading placeholders
                if (tagsContainer) {
                    const loadingTag = Array.from(tagsContainer.children).find(span => 
                        span.textContent && span.textContent.includes('Loading tags...')
                    );
                    if (loadingTag) {
                        // Get the version data to update tags
                        const typeData = this.patchNotes.get(type);
                        if (typeData) {
                            const versionData = typeData.versions.find(v => v.version === version);
                            if (versionData && versionData.metadata && versionData.metadata.tags) {
                                this.updateVersionTags(uniqueId, versionData.metadata.tags);
                            }
                        }
                    }
                }
                break;
                
            case 'error':
                if (loadingIndicator) {
                    loadingIndicator.innerHTML = `
                        <span class="text-xs text-red-500">Failed to load</span>
                    `;
                }
                if (chevron) chevron.style.opacity = '0.3';
                break;
        }
    }

    // Update version tags after loading
    updateVersionTags(uniqueId, tags) {
        const button = document.querySelector(`[onclick="togglePatchNoteVersion('${uniqueId}')"]`);
        if (!button) return;
        
        const tagsContainer = button.querySelector('.flex.flex-wrap.gap-1');
        if (!tagsContainer) return;
        
        const tagColors = {
            'CRITICAL FIXES': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            'MAJOR IMPROVEMENTS': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            'NEW FEATURES': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'BREAKING CHANGES': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
            'MOBILE IMPROVEMENTS': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            'MOBILE ENHANCEMENTS': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            'SECURITY ENHANCEMENTS': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            'WEBSOCKET IMPROVEMENTS': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
            'TRADING INTERFACE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
            'UI IMPROVEMENTS': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
            'PERFORMANCE OPTIMIZATION': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            'ADMIN IMPROVEMENTS': 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
            'SETTINGS SYSTEM': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
            'DOCUMENTATION': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
            'MAJOR FEATURES': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'SYSTEM ENHANCEMENTS': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
        };
        
        // Clear existing tags
        tagsContainer.innerHTML = '';
        
        // Add new tags
        if (tags && tags.length > 0) {
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = `px-2 py-1 text-xs font-medium rounded-full ${tagColors[tag] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300'}`;
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
        }
    }

    // Refresh a single version entry after loading
    refreshVersionEntry(type, versionData) {
        const uniqueId = `${type}-${versionData.version.replace(/\./g, '-')}`;
        const existingEntry = document.querySelector(`[onclick="togglePatchNoteVersion('${uniqueId}')"]`)?.closest('.border.border-zinc-200');
        
        if (existingEntry) {
            // Generate new HTML for this version
            const newHTML = this.generateVersionEntry(type, versionData);
            
            // Create a temporary container to parse the HTML
            const temp = document.createElement('div');
            temp.innerHTML = newHTML;
            const newEntry = temp.firstElementChild;
            
            // Replace the existing entry
            existingEntry.parentNode.replaceChild(newEntry, existingEntry);
        }
    }

    // Load version content on demand (when user clicks)
    async loadVersionOnDemand(type, version) {
        const typeData = this.patchNotes.get(type);
        if (!typeData) return null;
        
        const versionData = typeData.versions.find(v => v.version === version);
        if (!versionData) return null;
        
        if (versionData.isLoaded) {
            return versionData.content;
        }
        
        if (versionData.isLoading) {
            // Wait for current loading to complete
            while (versionData.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return versionData.content;
        }
        
        // Load immediately if not already loading
        try {
            versionData.isLoading = true;
            this.updateVersionUI(type, version, 'loading');
            
            const content = await this.loadVersionFile(type, version);
            if (content) {
                versionData.content = content;
                versionData.metadata = this.parseMetadata(content);
                versionData.isLoaded = true;
                versionData.isLoading = false;
                
                this.updateVersionUI(type, version, 'loaded');
                return content;
            } else {
                versionData.isLoading = false;
                this.updateVersionUI(type, version, 'error');
                return null;
            }
        } catch (error) {
            console.warn(`Failed to load version on demand ${type}/${version}:`, error);
            versionData.isLoading = false;
            this.updateVersionUI(type, version, 'error');
            return null;
        }
    }

    // Load a specific version file with timeout
    async loadVersionFile(type, version) {
        try {
            // Check if we're running in file:// protocol
            const isFileProtocol = window.location.protocol === 'file:';
            
            if (isFileProtocol) {
                // For file:// protocol, show a message that files need to be served via HTTP
                console.warn(`Cannot load ${type}/${version}.md via file:// protocol. Please serve via HTTP server.`);
                return this.getFallbackContent(type, version);
            }
            
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
            });
            
            // Add cache-busting parameters
            const cacheBuster = Date.now();
            const url = `content/${type}/patch-notes/${version}.md?v=${this.cacheVersion}&t=${cacheBuster}`;
            
            // Race between fetch and timeout
            const fetchPromise = fetch(url, {
                method: 'GET',
                cache: 'no-cache'
            });
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            if (!content || content.trim().length === 0) {
                throw new Error('Empty content received');
            }
            
            return content;
        } catch (error) {
            console.warn(`Failed to load ${type}/${version}.md:`, error.message);
            return this.getFallbackContent(type, version);
        }
    }

    // Get fallback content when files can't be loaded
    getFallbackContent(type, version) {
        return `# Version ${version}
**Release Date:** TBD  
**Tags:** INFO

## Notice

This version's detailed patch notes are available but cannot be loaded directly from the file system.

**To view full patch notes:**
1. **Serve via HTTP**: Use a local web server (like \`python -m http.server\` or \`npx serve\`)
2. **Or access via XAMPP**: Visit \`http://localhost/v5/docs/\` instead of opening the file directly

**Quick Info:**
- Version: ${version}
- Type: ${type.charAt(0).toUpperCase() + type.slice(1)}
- Status: Available in \`/docs/content/${type}/patch-notes/${version}.md\`

## Alternative Access

You can view the patch notes by:
- Opening the markdown file directly: \`docs/content/${type}/patch-notes/${version}.md\`
- Setting up a local web server to serve the docs folder
- Using the frontend application at \`http://localhost:3000\` if available`;
    }

    // Parse metadata from markdown content
    parseMetadata(content) {
        const lines = content.split('\n');
        const metadata = {};
        
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('**Release Date:**')) {
                metadata.releaseDate = line.replace('**Release Date:**', '').trim();
            } else if (line.startsWith('**Tags:**')) {
                metadata.tags = line.replace('**Tags:**', '').trim().split(',').map(t => t.trim());
            }
        }
        
        return metadata;
    }

    // Compare semantic versions
    compareVersions(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            
            if (aPart !== bPart) {
                return aPart - bPart;
            }
        }
        
        return 0;
    }

    // Generate HTML for patch notes page
    generatePatchNotesHTML() {
        const isFileProtocol = window.location.protocol === 'file:';
        
        if (this.patchNotes.size === 0) {
            if (isFileProtocol) {
                return `
                    <div class="text-center py-12">
                        <div class="text-6xl mb-4">⚠️</div>
                        <h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">File Protocol Detected</h2>
                        <div class="max-w-2xl mx-auto text-left bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                            <h3 class="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-3">📋 To view patch notes, please:</h3>
                            <ol class="list-decimal list-inside space-y-2 text-yellow-800 dark:text-yellow-200">
                                <li><strong>Use XAMPP:</strong> Visit <code class="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded">http://localhost/v5/docs/</code></li>
                                <li><strong>Or use Python:</strong> Run <code class="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded">python -m http.server</code> in the docs folder</li>
                                <li><strong>Or use Node:</strong> Run <code class="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded">npx serve .</code> in the docs folder</li>
                            </ol>
                            <div class="mt-4 p-3 bg-yellow-100 dark:bg-yellow-800/30 rounded">
                                <p class="text-sm text-yellow-700 dark:text-yellow-300">
                                    <strong>Why?</strong> Browsers block local file access for security. A web server is needed to load the markdown files.
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="text-center py-12">
                        <div class="text-6xl mb-4">📝</div>
                        <h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">No Patch Notes Found</h2>
                        <p class="text-zinc-600 dark:text-zinc-400">Patch notes are being loaded or are not available yet.</p>
                    </div>
                `;
            }
        }

        let html = `
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-12">
                    <div class="text-6xl mb-4">🚀</div>
                    <h1 class="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Patch Notes</h1>
                    <p class="text-xl text-zinc-600 dark:text-zinc-400">Stay updated with the latest changes and improvements</p>
                </div>
                
                <!-- Loading Progress Indicator -->
                <div id="patch-notes-progress" class="mb-8 transition-all duration-300">
                    <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Loading patch notes...</span>
                            <span id="loading-status" class="text-sm text-zinc-500">Initializing...</span>
                        </div>
                        <div class="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                            <div id="loading-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                </div>

                <div class="space-y-8">
        `;

        // Separate core and extensions
        const coreData = this.patchNotes.get('core');
        const extensionTypes = Array.from(this.patchNotes.keys()).filter(type => type !== 'core').sort();

        // Core section
        if (coreData) {
            html += this.generateTypeSection('core', coreData, true);
        }

        // Extensions section
        if (extensionTypes.length > 0) {
            html += `
                <div class="border-t border-zinc-200 dark:border-zinc-700 pt-8">
                    <h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center">
                        <span class="text-2xl mr-3">🧩</span>
                        Extensions
                    </h2>
                    <div class="space-y-6">
            `;

            for (const type of extensionTypes) {
                const typeData = this.patchNotes.get(type);
                if (typeData) {
                    html += this.generateTypeSection(type, typeData, false);
                }
            }

            html += `
                    </div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // Generate section for a specific type
    generateTypeSection(type, typeData, isCore) {
        const icon = this.extensionIcons[type] || '📦';
        const gradient = this.extensionColors[type] || 'from-zinc-500 to-zinc-600';
        const title = type === 'core' ? 'Core Platform' : this.capitalizeWords(type);

        let html = `
            <div class="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div class="bg-gradient-to-r ${gradient} p-6">
                    <div class="flex items-center space-x-4">
                        <div class="text-3xl">${icon}</div>
                        <div>
                            <h3 class="text-2xl font-bold text-white">${title}</h3>
                            <p class="text-white/80">${typeData.versions.length} version${typeData.versions.length !== 1 ? 's' : ''} available</p>
                        </div>
                    </div>
                </div>
                <div class="p-6">
                    <div class="space-y-4">
        `;

        // Generate version entries
        for (const versionData of typeData.versions) {
            html += this.generateVersionEntry(type, versionData);
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    // Generate individual version entry
    generateVersionEntry(type, versionData) {
        const { version, content, metadata, isLoaded, isLoading } = versionData;
        const uniqueId = `${type}-${version.replace(/\./g, '-')}`;
        
        // Parse tags for styling (use metadata if available, otherwise show loading state)
        const tags = metadata ? (metadata.tags || []) : [];
        const tagColors = {
            // Critical and Major Changes
            'CRITICAL FIXES': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            'MAJOR IMPROVEMENTS': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            'NEW FEATURES': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'BREAKING CHANGES': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
            
            // Feature Categories
            'MOBILE IMPROVEMENTS': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            'MOBILE ENHANCEMENTS': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            'SECURITY ENHANCEMENTS': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            'WEBSOCKET IMPROVEMENTS': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
            'TRADING INTERFACE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
            'UI IMPROVEMENTS': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
            'PERFORMANCE OPTIMIZATION': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            'ADMIN IMPROVEMENTS': 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
            'SETTINGS SYSTEM': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
            'DOCUMENTATION': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
            
            // System Areas
            'MAJOR FEATURES': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'SYSTEM ENHANCEMENTS': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
        };

        // Determine loading state styling
        const buttonClass = isLoaded ? '' : 'opacity-50';
        const releaseDate = metadata ? metadata.releaseDate : null;
        
        let html = `
            <div class="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <button 
                    class="w-full px-4 py-3 text-left bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${buttonClass}"
                    onclick="togglePatchNoteVersion('${uniqueId}')"
                >
                    <div class="flex items-center space-x-3">
                        <span class="font-semibold text-zinc-900 dark:text-zinc-100">Version ${version}</span>
                        ${releaseDate ? `<span class="text-sm text-zinc-500 dark:text-zinc-400">${releaseDate}</span>` : ''}
                        <div class="flex flex-wrap gap-1">
                            ${tags.length > 0 ? tags.map(tag => `
                                <span class="px-2 py-1 text-xs font-medium rounded-full ${tagColors[tag] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300'}">
                                    ${tag}
                                </span>
                            `).join('') : (!isLoaded ? `
                                <span class="px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                                    Loading tags...
                                </span>
                            ` : '')}
                        </div>
                    </div>
                    <svg class="w-5 h-5 text-zinc-400 transform transition-transform" id="chevron-${uniqueId}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div class="hidden px-4 py-4 border-t border-zinc-200 dark:border-zinc-700" id="content-${uniqueId}">
                    <div class="prose prose-zinc dark:prose-invert max-w-none">
                        ${isLoaded && content ? this.markdownToHTML(content) : `
                            <div class="flex items-center justify-center py-8">
                                <div class="text-center">
                                    <svg class="animate-spin mx-auto h-8 w-8 text-zinc-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p class="text-zinc-500 dark:text-zinc-400">Loading patch notes...</p>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    // Simple markdown to HTML conversion
    markdownToHTML(markdown) {
        // Skip the first few lines (version header and metadata)
        const lines = markdown.split('\n');
        let contentStart = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('## ') || lines[i].startsWith('### ')) {
                contentStart = i;
                break;
            }
        }
        
        const content = lines.slice(contentStart).join('\n');
        
        return content
            // Headers
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-6 mb-3">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">$1</h1>')
            // Bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900 dark:text-zinc-100">$1</strong>')
            // Lists - handle nested structure
            .split('\n')
            .map(line => {
                if (line.trim().startsWith('- ')) {
                    return `<li class="text-zinc-700 dark:text-zinc-300 mb-1">${line.trim().substring(2)}</li>`;
                }
                return line;
            })
            .join('\n')
            // Code blocks (simple)
            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded text-sm font-mono">$1</code>')
            // Wrap consecutive list items in ul tags
            .replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, match => {
                return `<ul class="list-disc list-inside space-y-1 mb-4 ml-4">${match}</ul>`;
            })
            // Convert line breaks to paragraphs
            .split('\n\n')
            .map(paragraph => {
                const trimmed = paragraph.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li')) {
                    return trimmed;
                }
                return `<p class="text-zinc-700 dark:text-zinc-300 mb-3">${trimmed.replace(/\n/g, '<br>')}</p>`;
            })
            .filter(p => p)
            .join('\n');
    }

    // Capitalize words for display
    capitalizeWords(str) {
        return str.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
}

// Global function to toggle patch note versions with lazy loading
async function togglePatchNoteVersion(uniqueId) {
    const content = document.getElementById(`content-${uniqueId}`);
    const chevron = document.getElementById(`chevron-${uniqueId}`);
    
    if (content && chevron) {
        const isHidden = content.classList.contains('hidden');
        
        if (isHidden) {
            // Extract type and version from uniqueId
            const parts = uniqueId.split('-');
            const version = parts.slice(1).join('.');
            const type = parts[0];
            
            // Check if content needs to be loaded
            const patchNotesSystem = window.patchNotesSystemInstance;
            if (patchNotesSystem) {
                const typeData = patchNotesSystem.patchNotes.get(type);
                if (typeData) {
                    const versionData = typeData.versions.find(v => v.version === version);
                    if (versionData && !versionData.isLoaded && !versionData.isLoading) {
                        // Load content on demand
                        const loadedContent = await patchNotesSystem.loadVersionOnDemand(type, version);
                        if (loadedContent) {
                            // Update the content div with loaded content
                            const contentDiv = content.querySelector('.prose');
                            if (contentDiv) {
                                contentDiv.innerHTML = patchNotesSystem.markdownToHTML(loadedContent);
                            }
                        }
                    }
                }
            }
            
            content.classList.remove('hidden');
            chevron.style.transform = 'rotate(180deg)';
        } else {
            content.classList.add('hidden');
            chevron.style.transform = 'rotate(0deg)';
        }
    }
}

// Initialize patch notes system when DOM is loaded
if (typeof window !== 'undefined') {
    window.PatchNotesSystem = PatchNotesSystem;
    window.togglePatchNoteVersion = togglePatchNoteVersion;
    
    // Store global instance for access in toggle function
    window.patchNotesSystemInstance = null;
} 