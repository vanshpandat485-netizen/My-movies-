// js/script.js - User Frontend Logic

class MovieApp {
    constructor() {
        this.movies = [];
        this.filteredMovies = [];
        this.appConfig = null;
        this.currentMovie = null;
        this.downloadLinks = {};
        this.isRefreshing = false;
        
        this.init();
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        await this.loadData();
        this.setupPullToRefresh();
        this.setupNetworkListener();
        this.hideSplashScreen();
    }

    bindElements() {
        // Splash screen
        this.splashScreen = document.getElementById('splash-screen');
        this.appContainer = document.getElementById('app-container');
        
        // Header
        this.searchInput = document.getElementById('search-input');
        this.clearSearchBtn = document.getElementById('clear-search');
        this.refreshBtn = document.getElementById('refresh-btn');
        
        // Home view
        this.homeView = document.getElementById('home-view');
        this.movieGrid = document.getElementById('movie-grid');
        this.noResults = document.getElementById('no-results');
        this.skeletonLoader = document.getElementById('skeleton-loader');
        
        // Banner ad
        this.bannerAdContainer = document.getElementById('banner-ad-container');
        this.bannerAdImage = document.getElementById('banner-ad-image');
        this.bannerAdLink = document.getElementById('banner-ad-link');
        
        // Detail view
        this.detailView = document.getElementById('detail-view');
        this.backBtn = document.getElementById('back-btn');
        this.shareBtn = document.getElementById('share-btn');
        this.detailTitle = document.getElementById('detail-title');
        this.detailPoster = document.getElementById('detail-poster');
        this.detailRating = document.getElementById('detail-rating');
        this.detailYear = document.getElementById('detail-year');
        this.detailDescription = document.getElementById('detail-description');
        this.downloadBtns = document.querySelectorAll('.download-btn');
        
        // Interstitial ad
        this.interstitialOverlay = document.getElementById('interstitial-overlay');
        this.interstitialImage = document.getElementById('interstitial-image');
        this.interstitialLink = document.getElementById('interstitial-link');
        this.closeInterstitialBtn = document.getElementById('close-interstitial');
        this.countdownEl = document.getElementById('countdown');
        this.closeIcon = document.getElementById('close-icon');
        this.skipTimer = document.getElementById('skip-timer');
        
        // Permanent poster ad
        this.permanentPosterAd = document.getElementById('permanent-poster-ad');
        this.permanentPosterImage = document.getElementById('permanent-poster-image');
        this.permanentPosterLink = document.getElementById('permanent-poster-link');
        
        // Pull to refresh
        this.pullRefresh = document.getElementById('pull-refresh');
        
        // Toast & Network
        this.toastContainer = document.getElementById('toast-container');
        this.networkStatus = document.getElementById('network-status');
        
        // Categories
        this.categoryBtns = document.querySelectorAll('.category-btn');
    }

    bindEvents() {
        // Search
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.clearSearchBtn.addEventListener('click', () => this.clearSearch());
        
        // Refresh
        this.refreshBtn.addEventListener('click', () => this.refreshData());
        
        // Back button
        this.backBtn.addEventListener('click', () => this.hideDetailView());
        
        // Share button
        this.shareBtn.addEventListener('click', () => this.shareMovie());
        
        // Download buttons
        this.downloadBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDownload(e.target.closest('.download-btn').dataset.quality));
        });
        
        // Close interstitial
        this.closeInterstitialBtn.addEventListener('click', () => this.closeInterstitial());
        
        // Category buttons
        this.categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.filterByCategory(e.target.dataset.category));
        });
        
        // Handle browser back button
        window.addEventListener('popstate', (e) => {
            if (this.detailView && !this.detailView.classList.contains('hidden')) {
                this.hideDetailView();
            }
        });
    }

    // ============================================
    // DATA LOADING & CACHING
    // ============================================

    async loadData() {
        try {
            this.showSkeletonLoader();
            
            // Check if cache is still valid
            if (this.isCacheValid()) {
                this.movies = this.getCachedMovies();
                this.showToast('Loaded from cache', 'info');
            } else {
                // Fetch fresh data from Appwrite
                await this.fetchMoviesFromAppwrite();
            }
            
            // Load app config (ads settings)
            await this.loadAppConfig();
            
            this.filteredMovies = [...this.movies];
            this.renderMovies();
            this.hideSkeletonLoader();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Failed to load movies', 'error');
            
            // Try to use cached data if available
            const cachedMovies = this.getCachedMovies();
            if (cachedMovies.length > 0) {
                this.movies = cachedMovies;
                this.filteredMovies = [...this.movies];
                this.renderMovies();
                this.showToast('Showing cached data', 'warning');
            }
            this.hideSkeletonLoader();
        }
    }

    isCacheValid() {
        const timestamp = localStorage.getItem(AppConfig.cacheKeys.moviesTimestamp);
        const cacheVersion = localStorage.getItem(AppConfig.cacheKeys.cacheVersion);
        const cachedData = localStorage.getItem(AppConfig.cacheKeys.movies);
        
        if (!timestamp || !cachedData) return false;
        
        const now = Date.now();
        const cacheAge = now - parseInt(timestamp);
        
        // Check if cache is older than 3 hours
        if (cacheAge > AppConfig.cacheDuration) return false;
        
        // Check if cache version matches (for admin-forced refresh)
        const storedVersion = localStorage.getItem('stored_cache_version');
        if (cacheVersion && storedVersion !== cacheVersion) {
            localStorage.setItem('stored_cache_version', cacheVersion);
            return false;
        }
        
        return true;
    }

    getCachedMovies() {
        try {
            const cachedData = localStorage.getItem(AppConfig.cacheKeys.movies);
            return cachedData ? JSON.parse(cachedData) : [];
        } catch (error) {
            console.error('Error parsing cached movies:', error);
            return [];
        }
    }

    cacheMovies(movies) {
        try {
            localStorage.setItem(AppConfig.cacheKeys.movies, JSON.stringify(movies));
            localStorage.setItem(AppConfig.cacheKeys.moviesTimestamp, Date.now().toString());
        } catch (error) {
            console.error('Error caching movies:', error);
        }
    }

    async fetchMoviesFromAppwrite() {
        try {
            const response = await databases.listDocuments(
                AppConfig.databaseId,
                AppConfig.collections.movies,
                [
                    Appwrite.Query.orderDesc('$createdAt'),
                    Appwrite.Query.limit(100)
                ]
            );
            
            this.movies = response.documents.map(doc => ({
                id: doc.$id,
                title: doc.title,
                description: doc.description,
                poster_url: doc.poster_url,
                rating: doc.rating,
                year: doc.year,
                category: doc.category || 'action',
                duration: doc.duration || '2h',
                download_480p: doc.download_480p,
                download_720p: doc.download_720p,
                download_1080p: doc.download_1080p
            }));
            
            // Cache the movies
            this.cacheMovies(this.movies);
            
        } catch (error) {
            console.error('Error fetching movies from Appwrite:', error);
            throw error;
        }
    }

    async loadAppConfig() {
        try {
            const response = await databases.listDocuments(
                AppConfig.databaseId,
                AppConfig.collections.appConfig,
                [Appwrite.Query.limit(1)]
            );
            
            if (response.documents.length > 0) {
                this.appConfig = response.documents[0];
                this.setupAds();
                
                // Store cache version
                if (this.appConfig.cache_version) {
                    localStorage.setItem(AppConfig.cacheKeys.cacheVersion, this.appConfig.cache_version);
                }
            }
        } catch (error) {
            console.error('Error loading app config:', error);
        }
    }

    setupAds() {
        if (!this.appConfig) return;
        
        // Banner Ad
        if (this.appConfig.banner_image_url) {
            this.bannerAdImage.src = this.appConfig.banner_image_url;
            this.bannerAdLink.href = this.appConfig.banner_target_url || '#';
            this.bannerAdContainer.classList.remove('hidden');
        } else {
            this.bannerAdContainer.classList.add('hidden');
        }
        
        // Interstitial Ad
        if (this.appConfig.interstitial_image_url) {
            this.interstitialImage.src = this.appConfig.interstitial_image_url;
            this.interstitialLink.href = this.appConfig.interstitial_target_url || '#';
        }
        
        // Permanent Poster Ad
        if (this.appConfig.poster_image_url) {
            this.permanentPosterImage.src = this.appConfig.poster_image_url;
            this.permanentPosterLink.href = this.appConfig.poster_target_url || '#';
            this.permanentPosterAd.classList.remove('hidden');
        } else {
            this.permanentPosterAd.classList.add('hidden');
        }
    }

    async refreshData() {
        if (this.isRefreshing) return;
        
        this.isRefreshing = true;
        this.refreshBtn.classList.add('spinning');
        
        try {
            // Clear cache
            localStorage.removeItem(AppConfig.cacheKeys.movies);
            localStorage.removeItem(AppConfig.cacheKeys.moviesTimestamp);
            
            // Fetch fresh data
            await this.fetchMoviesFromAppwrite();
            await this.loadAppConfig();
            
            this.filteredMovies = [...this.movies];
            this.renderMovies();
            
            this.showToast('Data refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showToast('Failed to refresh data', 'error');
        } finally {
            this.isRefreshing = false;
            this.refreshBtn.classList.remove('spinning');
        }
    }

    // ============================================
    // SEARCH FUNCTIONALITY
    // ============================================

    handleSearch(query) {
        query = query.toLowerCase().trim();
        
        if (query === '') {
            this.clearSearchBtn.classList.add('hidden');
            this.filteredMovies = [...this.movies];
        } else {
            this.clearSearchBtn.classList.remove('hidden');
            this.filteredMovies = this.movies.filter(movie => 
                movie.title.toLowerCase().includes(query) ||
                (movie.description && movie.description.toLowerCase().includes(query))
            );
        }
        
        this.renderMovies();
    }

    clearSearch() {
        this.searchInput.value = '';
        this.clearSearchBtn.classList.add('hidden');
        this.filteredMovies = [...this.movies];
        this.renderMovies();
    }

    filterByCategory(category) {
        this.categoryBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        if (category === 'all') {
            this.filteredMovies = [...this.movies];
        } else {
            this.filteredMovies = this.movies.filter(movie => 
                movie.category && movie.category.toLowerCase() === category.toLowerCase()
            );
        }
        
        this.renderMovies();
    }

    // ============================================
    // RENDERING
    // ============================================

    renderMovies() {
        if (this.filteredMovies.length === 0) {
            this.movieGrid.innerHTML = '';
            this.noResults.classList.remove('hidden');
            return;
        }
        
        this.noResults.classList.add('hidden');
        
        this.movieGrid.innerHTML = this.filteredMovies.map(movie => `
            <div class="movie-card" data-id="${movie.id}" onclick="app.showDetailView('${movie.id}')">
                <div class="movie-poster">
                    <img src="${movie.poster_url}" alt="${movie.title}" loading="lazy" 
                         onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'">
                    <div class="poster-rating">
                        <i class="fas fa-star"></i>
                        <span>${movie.rating || 'N/A'}</span>
                    </div>
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <span class="movie-year">${movie.year || 'N/A'}</span>
                </div>
            </div>
        `).join('');
    }

    // ============================================
    // DETAIL VIEW
    // ============================================

    showDetailView(movieId) {
        this.currentMovie = this.movies.find(m => m.id === movieId);
        
        if (!this.currentMovie) {
            this.showToast('Movie not found', 'error');
            return;
        }
        
        // Update URL without reloading
        history.pushState({ movieId }, '', `#movie=${movieId}`);
        
        // Populate detail view
        this.detailTitle.textContent = this.currentMovie.title;
        this.detailPoster.src = this.currentMovie.poster_url;
        this.detailRating.querySelector('span').textContent = this.currentMovie.rating || 'N/A';
        this.detailYear.innerHTML = `<i class="fas fa-calendar"></i> ${this.currentMovie.year || 'N/A'}`;
        this.detailDescription.textContent = this.currentMovie.description || 'No description available.';
        
        // Store download links
        this.downloadLinks = {
            '480p': this.currentMovie.download_480p,
            '720p': this.currentMovie.download_720p,
            '1080p': this.currentMovie.download_1080p
        };
        
        // Show detail view
        this.homeView.classList.add('hidden');
        this.detailView.classList.remove('hidden');
        
        // Scroll to top
        window.scrollTo(0, 0);
    }

    hideDetailView() {
        this.detailView.classList.add('slide-out');
        
        setTimeout(() => {
            this.detailView.classList.add('hidden');
            this.detailView.classList.remove('slide-out');
            this.homeView.classList.remove('hidden');
            
            // Update URL
            history.pushState({}, '', window.location.pathname);
        }, 300);
    }

    shareMovie() {
        if (!this.currentMovie) return;
        
        if (navigator.share) {
            navigator.share({
                title: this.currentMovie.title,
                text: `Check out ${this.currentMovie.title} on MovieFlix!`,
                url: window.location.href
            }).catch(err => console.log('Share failed:', err));
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href)
                .then(() => this.showToast('Link copied to clipboard!', 'success'))
                .catch(() => this.showToast('Failed to copy link', 'error'));
        }
    }

    // ============================================
    // DOWNLOAD & INTERSTITIAL AD
    // ============================================

    handleDownload(quality) {
        const link = this.downloadLinks[quality];
        
        if (!link) {
            this.showToast(`${quality} download not available`, 'warning');
            return;
        }
        
        // Store the quality for after ad closes
        this.pendingDownloadQuality = quality;
        
        // Show interstitial ad
        this.showInterstitialAd();
    }

    showInterstitialAd() {
        // Check if interstitial is configured
        if (!this.appConfig || !this.appConfig.interstitial_image_url) {
            // No interstitial configured, proceed directly to download
            this.proceedToDownload();
            return;
        }
        
        // Show overlay
        this.interstitialOverlay.classList.remove('hidden');
        
        // Reset countdown
        let countdown = 5;
        this.countdownEl.textContent = countdown;
        this.countdownEl.classList.remove('hidden');
        this.closeIcon.classList.add('hidden');
        this.closeInterstitialBtn.classList.add('disabled');
        this.skipTimer.textContent = countdown;
        
        // Start countdown
        const timer = setInterval(() => {
            countdown--;
            this.countdownEl.textContent = countdown;
            this.skipTimer.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(timer);
                this.countdownEl.classList.add('hidden');
                this.closeIcon.classList.remove('hidden');
                this.closeInterstitialBtn.classList.remove('disabled');
            }
        }, 1000);
        
        // Store timer reference for cleanup
        this.countdownTimer = timer;
    }

    closeInterstitial() {
        if (this.closeInterstitialBtn.classList.contains('disabled')) {
            return;
        }
        
        // Clear timer if still running
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }
        
        // Hide overlay
        this.interstitialOverlay.classList.add('hidden');
        
        // Proceed to download
        this.proceedToDownload();
    }

    proceedToDownload() {
        const quality = this.pendingDownloadQuality;
        const link = this.downloadLinks[quality];
        
        if (link) {
            // Open link in new tab
            window.open(link, '_blank', 'noopener,noreferrer');
            this.showToast(`Opening ${quality} download link...`, 'success');
        }
        
        // Clear pending download
        this.pendingDownloadQuality = null;
    }

    // ============================================
    // PULL TO REFRESH
    // ============================================

    setupPullToRefresh() {
        let startY = 0;
        let pulling = false;
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && e.touches[0].clientY > startY + 50) {
                pulling = true;
                this.pullRefresh.classList.add('visible');
            }
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            if (pulling) {
                pulling = false;
                this.pullRefresh.classList.remove('visible');
                this.refreshData();
            }
        });
    }

    // ============================================
    // NETWORK LISTENER
    // ============================================

    setupNetworkListener() {
        window.addEventListener('online', () => {
            this.networkStatus.classList.add('hidden');
            this.showToast('Back online', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.networkStatus.classList.remove('hidden');
            this.showToast('You are offline', 'warning');
        });
    }

    // ============================================
    // UI HELPERS
    // ============================================

    showSkeletonLoader() {
        this.skeletonLoader.classList.remove('hidden');
        this.movieGrid.classList.add('hidden');
    }

    hideSkeletonLoader() {
        this.skeletonLoader.classList.add('hidden');
        this.movieGrid.classList.remove('hidden');
    }

    hideSplashScreen() {
        setTimeout(() => {
            this.splashScreen.classList.add('fade-out');
            this.appContainer.classList.remove('hidden');
            
            setTimeout(() => {
                this.splashScreen.remove();
            }, 500);
        }, 2000);
    }

    showToast(message, type = 'info') {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MovieApp();
});

// Handle hash navigation on page load
window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash.startsWith('#movie=')) {
        const movieId = hash.replace('#movie=', '');
        setTimeout(() => {
            if (app) {
                app.showDetailView(movieId);
            }
        }, 2500);
    }
});
