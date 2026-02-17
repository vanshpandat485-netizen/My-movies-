// ==================================================
// MOVIEFLIX - USER FRONTEND SCRIPT (FIXED)
// ==================================================

// Wait for Appwrite SDK to load
if (typeof Appwrite === 'undefined') {
    console.error('❌ Appwrite SDK not loaded!');
}

// Appwrite Client Initialization
const client = new Appwrite.Client();
const databases = new Appwrite.Databases(client);

// Initialize client with error handling
try {
    client
        .setEndpoint(CONFIG.appwrite.endpoint)
        .setProject(CONFIG.appwrite.projectId);
    
    if (CONFIG.debug) {
        console.log('✅ Appwrite client initialized');
        console.log('📍 Endpoint:', CONFIG.appwrite.endpoint);
        console.log('📍 Project ID:', CONFIG.appwrite.projectId);
        console.log('📍 Database ID:', CONFIG.appwrite.databaseId);
    }
} catch (error) {
    console.error('❌ Failed to initialize Appwrite:', error);
}

// ==================================================
// CACHE MANAGEMENT SYSTEM
// ==================================================

const CacheManager = {
    /**
     * Get cached movies with timestamp validation
     */
    getMovies() {
        try {
            const cached = localStorage.getItem(CONFIG.cache.moviesKey);
            if (!cached) return null;

            const { data, timestamp, version } = JSON.parse(cached);
            const serverVersion = localStorage.getItem(CONFIG.cache.versionKey);

            // Check if cache is expired (3 hours)
            const isExpired = Date.now() - timestamp > CONFIG.cache.duration;

            // Check if server forced a refresh
            const isInvalidated = serverVersion && version !== serverVersion;

            if (isExpired || isInvalidated) {
                this.clearMovies();
                return null;
            }

            if (CONFIG.debug) {
                console.log('📦 Cache hit! Movies from localStorage');
            }
            return data;
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    },

    /**
     * Save movies to cache with timestamp
     */
    setMovies(movies) {
        try {
            const version = localStorage.getItem(CONFIG.cache.versionKey) || Date.now().toString();
            localStorage.setItem(CONFIG.cache.moviesKey, JSON.stringify({
                data: movies,
                timestamp: Date.now(),
                version: version
            }));
            if (CONFIG.debug) {
                console.log('💾 Movies cached successfully');
            }
        } catch (error) {
            console.error('Cache write error:', error);
        }
    },

    /**
     * Clear movies cache
     */
    clearMovies() {
        localStorage.removeItem(CONFIG.cache.moviesKey);
        if (CONFIG.debug) {
            console.log('🗑️ Movies cache cleared');
        }
    },

    /**
     * Get app configuration cache
     */
    getConfig() {
        try {
            const cached = localStorage.getItem(CONFIG.cache.configKey);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const isExpired = Date.now() - timestamp > CONFIG.cache.duration;

            if (isExpired) {
                localStorage.removeItem(CONFIG.cache.configKey);
                return null;
            }

            return data;
        } catch (error) {
            return null;
        }
    },

    /**
     * Save app configuration to cache
     */
    setConfig(config) {
        try {
            localStorage.setItem(CONFIG.cache.configKey, JSON.stringify({
                data: config,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Config cache write error:', error);
        }
    },

    /**
     * Get remaining cache time
     */
    getCacheTimeRemaining() {
        try {
            const cached = localStorage.getItem(CONFIG.cache.moviesKey);
            if (!cached) return 0;

            const { timestamp } = JSON.parse(cached);
            const remaining = CONFIG.cache.duration - (Date.now() - timestamp);
            return Math.max(0, remaining);
        } catch {
            return 0;
        }
    }
};

// ==================================================
// API SERVICE
// ==================================================

const ApiService = {
    /**
     * Fetch all movies from Appwrite
     */
    async fetchMovies(forceRefresh = false) {
        // Check cache first
        if (!forceRefresh) {
            const cached = CacheManager.getMovies();
            if (cached && cached.length > 0) {
                return cached;
            }
        }

        try {
            if (CONFIG.debug) {
                console.log('🌐 Fetching movies from Appwrite...');
                console.log('📂 Collection:', CONFIG.appwrite.collections.movies);
            }

            const response = await databases.listDocuments(
                CONFIG.appwrite.databaseId,
                CONFIG.appwrite.collections.movies,
                [
                    Appwrite.Query.orderDesc('$createdAt'),
                    Appwrite.Query.limit(100)
                ]
            );

            if (CONFIG.debug) {
                console.log('✅ Movies fetched:', response.documents.length);
            }

            const movies = response.documents;
            CacheManager.setMovies(movies);
            return movies;
        } catch (error) {
            console.error('❌ Fetch movies error:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                type: error.type
            });
            
            // Return empty array instead of throwing
            return [];
        }
    },

    /**
     * Fetch app configuration (ads)
     */
    async fetchAppConfig() {
        // Check cache first
        const cached = CacheManager.getConfig();
        if (cached) return cached;

        try {
            if (CONFIG.debug) {
                console.log('🌐 Fetching app config from Appwrite...');
            }

            const response = await databases.listDocuments(
                CONFIG.appwrite.databaseId,
                CONFIG.appwrite.collections.appConfig,
                [Appwrite.Query.limit(1)]
            );

            const config = response.documents[0] || null;
            if (config) {
                CacheManager.setConfig(config);
                if (CONFIG.debug) {
                    console.log('✅ App config loaded');
                }
            }
            return config;
        } catch (error) {
            console.error('❌ Config fetch error:', error);
            return null;
        }
    },

    /**
     * Test connection to Appwrite
     */
    async testConnection() {
        try {
            console.log('🔍 Testing Appwrite connection...');
            
            // Try to list documents (even if empty)
            const response = await databases.listDocuments(
                CONFIG.appwrite.databaseId,
                CONFIG.appwrite.collections.movies,
                [Appwrite.Query.limit(1)]
            );
            
            console.log('✅ Connection successful!');
            console.log('📊 Total movies in database:', response.total);
            return true;
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            console.error('');
            console.error('🔧 TROUBLESHOOTING STEPS:');
            console.error('1. Check if web platform is added in Appwrite Console');
            console.error('2. Verify collection "movies" exists');
            console.error('3. Check collection permissions (allow Any for Read)');
            console.error('4. Verify Project ID and Database ID are correct');
            console.error('');
            return false;
        }
    }
};

// ==================================================
// UI COMPONENTS
// ==================================================

const UI = {
    elements: {
        movieGrid: document.getElementById('movieGrid'),
        searchInput: document.getElementById('searchInput'),
        clearSearch: document.getElementById('clearSearch'),
        bannerAd: document.getElementById('bannerAd'),
        detailView: document.getElementById('detailView'),
        detailContent: document.getElementById('detailContent'),
        backButton: document.getElementById('backButton'),
        interstitialOverlay: document.getElementById('interstitialOverlay'),
        interstitialImage: document.getElementById('interstitialImage'),
        interstitialLink: document.getElementById('interstitialLink'),
        interstitialClose: document.getElementById('interstitialClose'),
        countdown: document.getElementById('countdown'),
        pullIndicator: document.getElementById('pullIndicator'),
        toastContainer: document.getElementById('toastContainer')
    },

    currentMovies: [],
    appConfig: null,
    pendingDownloadUrl: null,

    /**
     * Render loading skeletons
     */
    renderSkeletons(count = 12) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `<div class="movie-card skeleton skeleton-card"></div>`;
        }
        this.elements.movieGrid.innerHTML = html;
    },

    /**
     * Render movie grid
     */
    renderMovies(movies) {
        this.currentMovies = movies;

        if (!movies || movies.length === 0) {
            this.elements.movieGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">🎬</div>
                    <h3 class="empty-title">No movies found</h3>
                    <p class="empty-message">Add movies from the Admin Panel or check your search</p>
                    <button class="btn btn-primary" style="margin-top: 16px; max-width: 200px;" onclick="App.refreshData()">
                        🔄 Refresh
                    </button>
                    <p style="margin-top: 16px; font-size: 0.8rem; color: var(--text-muted);">
                        <a href="admin.html" style="color: var(--accent);">Open Admin Panel</a> to add movies
                    </p>
                </div>
            `;
            return;
        }

        const html = movies.map(movie => `
            <article class="movie-card" data-id="${movie.$id}" onclick="UI.openDetail('${movie.$id}')">
                <img 
                    src="${movie.poster_url || 'https://via.placeholder.com/300x450/1a1a1a/666?text=No+Poster'}" 
                    alt="${movie.title}" 
                    class="movie-poster loading"
                    loading="lazy"
                    onload="this.classList.remove('loading'); this.classList.add('loaded');"
                    onerror="this.src='https://via.placeholder.com/300x450/1a1a1a/666?text=Error';"
                >
                ${movie.rating ? `
                    <div class="movie-rating">
                        ⭐ ${movie.rating}
                    </div>
                ` : ''}
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    ${movie.year ? `<p class="movie-year">${movie.year}</p>` : ''}
                </div>
            </article>
        `).join('');

        this.elements.movieGrid.innerHTML = html;
    },

    /**
     * Render banner ad
     */
    renderBannerAd(config) {
        if (!config || !config.banner_image_url) {
            this.elements.bannerAd.innerHTML = `
                <div class="banner-placeholder">
                    <p>📢 Advertisement Space</p>
                    <p style="font-size: 0.8rem; margin-top: 8px; opacity: 0.7;">Configure ads in Admin Panel</p>
                </div>
            `;
            return;
        }

        this.elements.bannerAd.innerHTML = `
            <a href="${config.banner_target_url || '#'}" target="_blank" rel="noopener sponsored">
                <img 
                    src="${config.banner_image_url}" 
                    alt="Advertisement"
                    onerror="this.parentElement.parentElement.innerHTML='<div class=\\'banner-placeholder\\'><p>Ad failed to load</p></div>';"
                >
            </a>
        `;
    },

    /**
     * Open movie detail view
     */
    openDetail(movieId) {
        const movie = this.currentMovies.find(m => m.$id === movieId);
        if (!movie) return;

        // Render detail content
        this.elements.detailContent.innerHTML = `
            <div class="detail-poster-wrapper">
                <img 
                    src="${movie.poster_url || 'https://via.placeholder.com/400x600/1a1a1a/666?text=No+Poster'}" 
                    alt="${movie.title}" 
                    class="detail-poster"
                    onerror="this.src='https://via.placeholder.com/400x600/1a1a1a/666?text=Error';"
                >
            </div>
            <div class="detail-info">
                <h1 class="detail-title">${movie.title}</h1>
                <div class="detail-meta">
                    ${movie.year ? `
                        <span class="detail-year">
                            📅 ${movie.year}
                        </span>
                    ` : ''}
                    ${movie.rating ? `
                        <span class="detail-rating">
                            ⭐ ${movie.rating}/10
                        </span>
                    ` : ''}
                </div>
                ${movie.description ? `
                    <p class="detail-description">${movie.description}</p>
                ` : '<p class="detail-description" style="color: var(--text-muted);">No description available.</p>'}
                <div class="download-section">
                    <h3 class="download-title">⬇️ Download Links</h3>
                    <div class="download-buttons">
                        ${movie.download_480p ? `
                            <button class="download-btn" onclick="UI.handleDownload('${movie.download_480p}')">
                                <span>📥 480p</span>
                                <span class="download-quality">SD Quality</span>
                            </button>
                        ` : ''}
                        ${movie.download_720p ? `
                            <button class="download-btn" onclick="UI.handleDownload('${movie.download_720p}')">
                                <span>📥 720p</span>
                                <span class="download-quality">HD Quality</span>
                            </button>
                        ` : ''}
                        ${movie.download_1080p ? `
                            <button class="download-btn" onclick="UI.handleDownload('${movie.download_1080p}')">
                                <span>📥 1080p</span>
                                <span class="download-quality">Full HD</span>
                            </button>
                        ` : ''}
                        ${!movie.download_480p && !movie.download_720p && !movie.download_1080p ? `
                            <p style="color: var(--text-muted); padding: 20px;">No download links available yet.</p>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Show detail view with animation
        this.elements.detailView.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Add to browser history for back button support
        history.pushState({ movie: movieId }, '', `#movie-${movieId}`);
    },

    /**
     * Close movie detail view
     */
    closeDetail() {
        this.elements.detailView.classList.remove('active');
        document.body.style.overflow = '';
        
        // Update URL
        if (window.location.hash) {
            history.pushState({}, '', window.location.pathname);
        }
    },

    /**
     * Handle download button click
     */
    handleDownload(downloadUrl) {
        this.pendingDownloadUrl = downloadUrl;
        
        // Check if interstitial ad is configured
        if (this.appConfig && this.appConfig.interstitial_image_url) {
            this.showInterstitialAd();
        } else {
            // No ad configured, proceed directly
            this.proceedToDownload();
        }
    },

    /**
     * Show interstitial ad with countdown
     */
    showInterstitialAd() {
        // Set ad content
        this.elements.interstitialImage.src = this.appConfig.interstitial_image_url;
        this.elements.interstitialLink.href = this.appConfig.interstitial_target_url || '#';
        
        // Reset and show overlay
        this.elements.interstitialClose.disabled = true;
        this.elements.countdown.textContent = '5';
        this.elements.interstitialOverlay.classList.add('active');

        // Start countdown
        let count = 5;
        const countdownInterval = setInterval(() => {
            count--;
            this.elements.countdown.textContent = count;
            
            if (count <= 0) {
                clearInterval(countdownInterval);
                this.elements.interstitialClose.disabled = false;
                this.elements.countdown.textContent = '✕';
            }
        }, 1000);
    },

    /**
     * Close interstitial ad
     */
    closeInterstitialAd() {
        this.elements.interstitialOverlay.classList.remove('active');
        this.proceedToDownload();
    },

    /**
     * Proceed to download after ad
     */
    proceedToDownload() {
        if (this.pendingDownloadUrl) {
            window.open(this.pendingDownloadUrl, '_blank');
            this.pendingDownloadUrl = null;
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ==================================================
// SEARCH FUNCTIONALITY
// ==================================================

const Search = {
    debounceTimeout: null,

    /**
     * Initialize search handlers
     */
    init() {
        UI.elements.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        UI.elements.clearSearch.addEventListener('click', () => {
            UI.elements.searchInput.value = '';
            UI.elements.clearSearch.classList.remove('visible');
            UI.renderMovies(UI.currentMovies);
        });
    },

    /**
     * Handle search with debounce
     */
    handleSearch(query) {
        // Toggle clear button visibility
        UI.elements.clearSearch.classList.toggle('visible', query.length > 0);

        // Debounce search
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    },

    /**
     * Perform search on cached movies
     */
    performSearch(query) {
        const allMovies = CacheManager.getMovies() || UI.currentMovies || [];
        
        if (!query.trim()) {
            UI.renderMovies(allMovies);
            return;
        }

        const searchTerm = query.toLowerCase().trim();
        const filtered = allMovies.filter(movie => {
            return (
                movie.title?.toLowerCase().includes(searchTerm) ||
                movie.description?.toLowerCase().includes(searchTerm) ||
                movie.year?.toString().includes(searchTerm)
            );
        });

        UI.renderMovies(filtered);
    }
};

// ==================================================
// PULL TO REFRESH
// ==================================================

const PullToRefresh = {
    startY: 0,
    isPulling: false,

    init() {
        let pullDistance = 0;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0 && !UI.elements.detailView.classList.contains('active')) {
                this.startY = e.touches[0].pageY;
                this.isPulling = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.isPulling) return;

            const currentY = e.touches[0].pageY;
            pullDistance = currentY - this.startY;

            if (pullDistance > 80 && window.scrollY === 0) {
                UI.elements.pullIndicator.classList.add('visible');
            } else {
                UI.elements.pullIndicator.classList.remove('visible');
            }
        }, { passive: true });

        document.addEventListener('touchend', async () => {
            if (UI.elements.pullIndicator.classList.contains('visible')) {
                UI.elements.pullIndicator.classList.remove('visible');
                await App.refreshData();
            }
            this.isPulling = false;
            pullDistance = 0;
        });
    }
};

// ==================================================
// MAIN APP CONTROLLER
// ==================================================

const App = {
    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 MovieFlix initializing...');

        // Initialize components
        Search.init();
        PullToRefresh.init();
        this.setupEventListeners();

        // Test connection first
        const isConnected = await ApiService.testConnection();
        
        if (!isConnected) {
            UI.elements.movieGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">⚠️</div>
                    <h3 class="empty-title">Connection Error</h3>
                    <p class="empty-message">Could not connect to database. Please check:</p>
                    <ul style="text-align: left; margin: 16px auto; max-width: 300px; color: var(--text-secondary); font-size: 0.9rem;">
                        <li>Web platform is added in Appwrite</li>
                        <li>Collections exist with correct IDs</li>
                        <li>Permissions are set to "Any" for Read</li>
                    </ul>
                    <button class="btn btn-primary" style="margin-top: 16px; max-width: 200px;" onclick="location.reload()">
                        🔄 Retry
                    </button>
                    <p style="margin-top: 20px; font-size: 0.8rem; color: var(--text-muted);">
                        Check browser console for details (F12)
                    </p>
                </div>
            `;
            UI.renderBannerAd(null);
        } else {
            // Load data
            await this.loadData();
        }

        console.log('✅ MovieFlix ready!');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Back button
        UI.elements.backButton.addEventListener('click', () => {
            UI.closeDetail();
        });

        // Interstitial close button
        UI.elements.interstitialClose.addEventListener('click', () => {
            if (!UI.elements.interstitialClose.disabled) {
                UI.closeInterstitialAd();
            }
        });

        // Handle browser back button
        window.addEventListener('popstate', () => {
            if (UI.elements.detailView.classList.contains('active')) {
                UI.closeDetail();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (UI.elements.interstitialOverlay.classList.contains('active')) {
                    if (!UI.elements.interstitialClose.disabled) {
                        UI.closeInterstitialAd();
                    }
                } else if (UI.elements.detailView.classList.contains('active')) {
                    UI.closeDetail();
                }
            }
        });
    },

    /**
     * Load all data
     */
    async loadData() {
        UI.renderSkeletons();

        try {
            // Load movies and config in parallel
            const [movies, config] = await Promise.all([
                ApiService.fetchMovies(),
                ApiService.fetchAppConfig()
            ]);

            UI.appConfig = config;
            UI.renderMovies(movies);
            UI.renderBannerAd(config);

            // Show cache status
            const cacheTime = CacheManager.getCacheTimeRemaining();
            if (cacheTime > 0) {
                const minutes = Math.round(cacheTime / 60000);
                console.log(`📦 Cache valid for ${minutes} more minutes`);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            UI.elements.movieGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">😵</div>
                    <h3 class="empty-title">Failed to load movies</h3>
                    <p class="empty-message">Please check your connection and try again</p>
                    <button class="btn btn-primary" style="margin-top: 16px; max-width: 200px;" onclick="App.refreshData()">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    },

    /**
     * Force refresh data
     */
    async refreshData() {
        UI.showToast('🔄 Refreshing...', 'info');
        CacheManager.clearMovies();
        localStorage.removeItem(CONFIG.cache.configKey);
        await this.loadData();
        UI.showToast('✅ Content updated!', 'success');
    }
};

// ==================================================
// INITIALIZE APP ON LOAD
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
