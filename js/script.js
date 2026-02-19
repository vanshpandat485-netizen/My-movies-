// js/script.js - HopWeb Compatible Movie App

class MovieApp {
    constructor() {
        // Data
        this.movies = [];
        this.filteredMovies = [];
        this.appConfig = null;
        this.currentMovie = null;
        this.downloadLinks = {};
        
        // State
        this.isRefreshing = false;
        this.isLoading = false;
        
        // Interstitial State
        this.pendingDownloadLink = null;
        this.pendingDownloadQuality = null;
        this.countdownTimer = null;
        this.countdownValue = 5;
        this.canCloseInterstitial = false;
        
        // Initialize
        this.init();
    }

    async init() {
        try {
            this.bindElements();
            this.bindEvents();
            this.setupNetworkListener();
            await this.loadData();
            this.hideSplashScreen();
        } catch (error) {
            console.error('Init error:', error);
            this.showErrorScreen();
        }
    }

    // ============================================
    // ELEMENT BINDINGS
    // ============================================

    bindElements() {
        // Splash & Error Screens
        this.splashScreen = document.getElementById('splash-screen');
        this.appContainer = document.getElementById('app-container');
        this.errorScreen = document.getElementById('error-screen');
        this.retryBtn = document.getElementById('retry-btn');
        
        // Header
        this.searchInput = document.getElementById('search-input');
        this.clearSearchBtn = document.getElementById('clear-search');
        this.refreshBtn = document.getElementById('refresh-btn');
        
        // Home View
        this.homeView = document.getElementById('home-view');
        this.movieGrid = document.getElementById('movie-grid');
        this.noResults = document.getElementById('no-results');
        this.skeletonLoader = document.getElementById('skeleton-loader');
        this.sectionTitleText = document.getElementById('section-title-text');
        
        // Banner Ad
        this.bannerAdContainer = document.getElementById('banner-ad-container');
        this.bannerAdWrapper = document.getElementById('banner-ad-wrapper');
        this.bannerAdImage = document.getElementById('banner-ad-image');
        
        // Detail View
        this.detailView = document.getElementById('detail-view');
        this.backBtn = document.getElementById('back-btn');
        this.shareBtn = document.getElementById('share-btn');
        this.detailTitle = document.getElementById('detail-title');
        this.detailPoster = document.getElementById('detail-poster');
        this.detailRating = document.getElementById('detail-rating');
        this.detailYear = document.getElementById('detail-year');
        this.detailDuration = document.getElementById('detail-duration');
        this.detailDescription = document.getElementById('detail-description');
        
        // Download Buttons
        this.btn480p = document.getElementById('btn-480p');
        this.btn720p = document.getElementById('btn-720p');
        this.btn1080p = document.getElementById('btn-1080p');
        
        // Interstitial Ad
        this.interstitialOverlay = document.getElementById('interstitial-overlay');
        this.interstitialImageContainer = document.getElementById('interstitial-image-container');
        this.interstitialImage = document.getElementById('interstitial-image');
        this.closeInterstitialBtn = document.getElementById('close-interstitial');
        this.countdownEl = document.getElementById('countdown');
        this.skipNotice = document.getElementById('skip-notice');
        this.skipTimer = document.getElementById('skip-timer');
        
        // Permanent Poster Ad
        this.permanentPosterAd = document.getElementById('permanent-poster-ad');
        this.permanentPosterWrapper = document.getElementById('permanent-poster-wrapper');
        this.permanentPosterImage = document.getElementById('permanent-poster-image');
        
        // Toast & Network
        this.toastContainer = document.getElementById('toast-container');
        this.networkStatus = document.getElementById('network-status');
        
        // Categories
        this.categoryBtns = document.querySelectorAll('.category-btn');
    }

    // ============================================
    // EVENT BINDINGS
    // ============================================

    bindEvents() {
        // Search
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.clearSearchBtn.addEventListener('click', () => this.clearSearch());
        
        // Refresh
        this.refreshBtn.addEventListener('click', () => this.refreshData());
        
        // Retry
        this.retryBtn.addEventListener('click', () => this.retryLoad());
        
        // Back Button
        this.backBtn.addEventListener('click', () => this.hideDetailView());
        
        // Share Button
        this.shareBtn.addEventListener('click', () => this.shareMovie());
        
        // Download Buttons
        this.btn480p.addEventListener('click', () => this.handleDownload('480p'));
        this.btn720p.addEventListener('click', () => this.handleDownload('720p'));
        this.btn1080p.addEventListener('click', () => this.handleDownload('1080p'));
        
        // Interstitial Close
        this.closeInterstitialBtn.addEventListener('click', () => this.closeInterstitial());
        
        // Interstitial Ad Click
        this.interstitialImageContainer.addEventListener('click', () => this.handleInterstitialClick());
        
        // Banner Ad Click
        this.bannerAdWrapper.addEventListener('click', () => this.handleBannerAdClick());
        
        // Permanent Poster Ad Click
        this.permanentPosterWrapper.addEventListener('click', () => this.handlePosterAdClick());
        
        // Category Buttons
        this.categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.filterByCategory(e.target.dataset.category));
        });
        
        // Hardware Back Button (Android)
        document.addEventListener('backbutton', (e) => this.handleBackButton(e), false);
        
        // Also listen for popstate
        window.addEventListener('popstate', () => this.handleBackButton());
    }

    // ============================================
    // DATA LOADING
    // ============================================

    async loadData() {
        try {
            this.showSkeletonLoader();
            
            // Check cache first
            if (this.isCacheValid()) {
                const cachedMovies = this.getCachedMovies();
                if (cachedMovies.length > 0) {
                    this.movies = cachedMovies;
                    this.filteredMovies = [...this.movies];
                    this.renderMovies();
                    this.hideSkeletonLoader();
                    
                    // Load app config in background
                    this.loadAppConfig();
                    return;
                }
            }
            
            // Fetch fresh data
            await this.fetchMoviesFromAppwrite();
            await this.loadAppConfig();
            
            this.filteredMovies = [...this.movies];
            this.renderMovies();
            this.hideSkeletonLoader();
            
        } catch (error) {
            console.error('Error loading data:', error);
            
            // Try cached data
            const cachedMovies = this.getCachedMovies();
            if (cachedMovies.length > 0) {
                this.movies = cachedMovies;
                this.filteredMovies = [...this.movies];
                this.renderMovies();
                this.hideSkeletonLoader();
                this.showToast('Showing offline data', 'warning');
            } else {
                this.hideSkeletonLoader();
                this.showErrorScreen();
            }
        }
    }

    isCacheValid() {
        const timestamp = localStorage.getItem(AppConfig.cacheKeys.moviesTimestamp);
        const cachedData = localStorage.getItem(AppConfig.cacheKeys.movies);
        
        if (!timestamp || !cachedData) return false;
        
        const cacheAge = Date.now() - parseInt(timestamp);
        if (cacheAge > AppConfig.cacheDuration) return false;
        
        // Check cache version
        const storedVersion = localStorage.getItem('stored_cache_version');
        const serverVersion = localStorage.getItem(AppConfig.cacheKeys.cacheVersion);
        
        if (serverVersion && storedVersion !== serverVersion) {
            return false;
        }
        
        return true;
    }

    getCachedMovies() {
        try {
            const cachedData = localStorage.getItem(AppConfig.cacheKeys.movies);
            return cachedData ? JSON.parse(cachedData) : [];
        } catch (error) {
            console.error('Cache parse error:', error);
            return [];
        }
    }

    cacheMovies(movies) {
        try {
            localStorage.setItem(AppConfig.cacheKeys.movies, JSON.stringify(movies));
            localStorage.setItem(AppConfig.cacheKeys.moviesTimestamp, Date.now().toString());
        } catch (error) {
            console.error('Cache save error:', error);
        }
    }

    async fetchMoviesFromAppwrite() {
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
            title: doc.title || '',
            description: doc.description || '',
            poster_url: doc.poster_url || '',
            rating: doc.rating || 0,
            year: doc.year || '',
            category: doc.category || 'action',
            duration: doc.duration || '',
            download_480p: doc.download_480p || '',
            download_720p: doc.download_720p || '',
            download_1080p: doc.download_1080p || ''
        }));
        
        this.cacheMovies(this.movies);
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
                
                // Update cache version
                if (this.appConfig.cache_version) {
                    const storedVersion = localStorage.getItem('stored_cache_version');
                    if (storedVersion !== this.appConfig.cache_version) {
                        localStorage.setItem('stored_cache_version', this.appConfig.cache_version);
                    }
                }
            }
        } catch (error) {
            console.error('App config load error:', error);
        }
    }

    setupAds() {
        if (!this.appConfig) return;
        
        // Banner Ad
        if (this.appConfig.banner_image_url && this.appConfig.banner_image_url.trim() !== '') {
            this.bannerAdImage.src = this.appConfig.banner_image_url;
            this.bannerAdContainer.classList.remove('hidden');
        } else {
            this.bannerAdContainer.classList.add('hidden');
        }
        
        // Interstitial Ad
        if (this.appConfig.interstitial_image_url && this.appConfig.interstitial_image_url.trim() !== '') {
            this.interstitialImage.src = this.appConfig.interstitial_image_url;
        }
        
        // Permanent Poster Ad
        if (this.appConfig.poster_image_url && this.appConfig.poster_image_url.trim() !== '') {
            this.permanentPosterImage.src = this.appConfig.poster_image_url;
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
            
            this.showToast('Refreshed successfully', 'success');
        } catch (error) {
            console.error('Refresh error:', error);
            this.showToast('Failed to refresh', 'error');
        } finally {
            this.isRefreshing = false;
            this.refreshBtn.classList.remove('spinning');
        }
    }

    retryLoad() {
        this.errorScreen.classList.add('hidden');
        this.splashScreen.classList.remove('hidden');
        this.splashScreen.classList.remove('fade-out');
        
        setTimeout(() => {
            this.loadData().then(() => {
                this.hideSplashScreen();
            });
        }, 500);
    }

    // ============================================
    // SEARCH & FILTER
    // ============================================

    handleSearch(query) {
        query = query.toLowerCase().trim();
        
        if (query === '') {
            this.clearSearchBtn.classList.add('hidden');
            this.filteredMovies = [...this.movies];
            this.sectionTitleText.textContent = 'Trending Movies';
        } else {
            this.clearSearchBtn.classList.remove('hidden');
            this.filteredMovies = this.movies.filter(movie =>
                movie.title.toLowerCase().includes(query) ||
                (movie.description && movie.description.toLowerCase().includes(query))
            );
            this.sectionTitleText.textContent = `Search: "${query}"`;
        }
        
        this.renderMovies();
    }

    clearSearch() {
        this.searchInput.value = '';
        this.clearSearchBtn.classList.add('hidden');
        this.filteredMovies = [...this.movies];
        this.sectionTitleText.textContent = 'Trending Movies';
        this.renderMovies();
        
        // Reset category
        this.categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'all');
        });
    }

    filterByCategory(category) {
        // Clear search
        this.searchInput.value = '';
        this.clearSearchBtn.classList.add('hidden');
        
        // Update active category
        this.categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        // Filter movies
        if (category === 'all') {
            this.filteredMovies = [...this.movies];
            this.sectionTitleText.textContent = 'Trending Movies';
        } else {
            this.filteredMovies = this.movies.filter(movie =>
                movie.category && movie.category.toLowerCase() === category.toLowerCase()
            );
            this.sectionTitleText.textContent = category.charAt(0).toUpperCase() + category.slice(1) + ' Movies';
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
            <div class="movie-card" data-id="${movie.id}">
                <div class="movie-poster">
                    <img src="${movie.poster_url}" alt="${movie.title}" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300x450/1a1a1a/666?text=No+Poster'">
                    <div class="poster-rating">
                        <i class="fas fa-star"></i>
                        <span>${movie.rating || 'N/A'}</span>
                    </div>
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <span class="movie-year">${movie.year || ''}</span>
                </div>
            </div>
        `).join('');
        
        // Add click events to movie cards
        document.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.id;
                this.showDetailView(movieId);
            });
        });
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
        
        // Populate detail view
        this.detailTitle.textContent = this.currentMovie.title;
        this.detailPoster.src = this.currentMovie.poster_url;
        this.detailPoster.onerror = () => {
            this.detailPoster.src = 'https://via.placeholder.com/300x450/1a1a1a/666?text=No+Poster';
        };
        
        this.detailRating.querySelector('span').textContent = this.currentMovie.rating || 'N/A';
        this.detailYear.innerHTML = `<i class="fas fa-calendar"></i> ${this.currentMovie.year || 'N/A'}`;
        this.detailDuration.innerHTML = `<i class="fas fa-clock"></i> ${this.currentMovie.duration || 'N/A'}`;
        this.detailDescription.textContent = this.currentMovie.description || 'No description available.';
        
        // Store download links
        this.downloadLinks = {
            '480p': this.currentMovie.download_480p || '',
            '720p': this.currentMovie.download_720p || '',
            '1080p': this.currentMovie.download_1080p || ''
        };
        
        // Update button states
        this.btn480p.disabled = !this.downloadLinks['480p'];
        this.btn720p.disabled = !this.downloadLinks['720p'];
        this.btn1080p.disabled = !this.downloadLinks['1080p'];
        
        // Show detail view
        this.homeView.classList.add('hidden');
        this.detailView.classList.remove('hidden');
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Push history state for back button
        history.pushState({ view: 'detail', movieId: movieId }, '');
    }

    hideDetailView() {
        this.detailView.classList.add('slide-out');
        
        setTimeout(() => {
            this.detailView.classList.add('hidden');
            this.detailView.classList.remove('slide-out');
            this.homeView.classList.remove('hidden');
            this.currentMovie = null;
        }, 300);
    }

    handleBackButton(e) {
        if (this.interstitialOverlay && !this.interstitialOverlay.classList.contains('hidden')) {
            // Close interstitial if open
            if (this.canCloseInterstitial) {
                this.closeInterstitial();
            }
            if (e) e.preventDefault();
            return;
        }
        
        if (this.detailView && !this.detailView.classList.contains('hidden')) {
            // Close detail view
            this.hideDetailView();
            if (e) e.preventDefault();
            return;
        }
    }

    shareMovie() {
        if (!this.currentMovie) return;
        
        const shareText = `Check out "${this.currentMovie.title}" on ${AppConfig.appName}!`;
        
        if (navigator.share) {
            navigator.share({
                title: this.currentMovie.title,
                text: shareText,
                url: window.location.href
            }).catch(err => console.log('Share error:', err));
        } else {
            // Fallback: copy to clipboard
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Link copied to clipboard!', 'success');
        }
    }

    // ============================================
    // DOWNLOAD & INTERSTITIAL
    // ============================================

    handleDownload(quality) {
        const link = this.downloadLinks[quality];
        
        if (!link || link.trim() === '') {
            this.showToast(`${quality} download not available`, 'warning');
            return;
        }
        
        // Store pending download
        this.pendingDownloadLink = link;
        this.pendingDownloadQuality = quality;
        
        // Check if interstitial is configured
        if (this.appConfig && 
            this.appConfig.interstitial_image_url && 
            this.appConfig.interstitial_image_url.trim() !== '') {
            // Show interstitial ad
            this.showInterstitialAd();
        } else {
            // No interstitial, proceed directly
            this.proceedToDownload();
        }
    }

    showInterstitialAd() {
        // Reset state
        this.canCloseInterstitial = false;
        this.countdownValue = 5;
        
        // Update UI
        this.countdownEl.textContent = this.countdownValue;
        this.countdownEl.classList.remove('close-ready');
        this.skipTimer.textContent = this.countdownValue;
        this.skipNotice.classList.remove('hidden');
        
        // Show overlay
        this.interstitialOverlay.classList.remove('hidden');
        
        // Clear any existing timer
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }
        
        // Start countdown
        this.countdownTimer = setInterval(() => {
            this.countdownValue--;
            this.countdownEl.textContent = this.countdownValue;
            this.skipTimer.textContent = this.countdownValue;
            
            if (this.countdownValue <= 0) {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                this.canCloseInterstitial = true;
                
                // Update close button
                this.countdownEl.innerHTML = '<i class="fas fa-times"></i>';
                this.countdownEl.classList.add('close-ready');
                this.skipNotice.innerHTML = '<span style="color: #4CAF50;">Tap X to continue</span>';
            }
        }, 1000);
    }

    closeInterstitial() {
        if (!this.canCloseInterstitial) {
            this.showToast(`Wait ${this.countdownValue} seconds`, 'info');
            return;
        }
        
        // Clear timer
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        
        // Hide overlay
        this.interstitialOverlay.classList.add('hidden');
        
        // Proceed to download
        this.proceedToDownload();
    }

    handleInterstitialClick() {
        // Open interstitial ad link
        if (this.appConfig && this.appConfig.interstitial_target_url) {
            this.openExternalLink(this.appConfig.interstitial_target_url);
        }
    }

    proceedToDownload() {
        const link = this.pendingDownloadLink;
        const quality = this.pendingDownloadQuality;
        
        if (link && link.trim() !== '') {
            this.showToast(`Opening ${quality} download...`, 'success');
            
            // Small delay to show toast
            setTimeout(() => {
                this.openExternalLink(link);
            }, 500);
        }
        
        // Clear pending
        this.pendingDownloadLink = null;
        this.pendingDownloadQuality = null;
    }

    // ============================================
    // AD CLICK HANDLERS
    // ============================================

    handleBannerAdClick() {
        if (this.appConfig && this.appConfig.banner_target_url) {
            this.openExternalLink(this.appConfig.banner_target_url);
        }
    }

    handlePosterAdClick() {
        if (this.appConfig && this.appConfig.poster_target_url) {
            this.openExternalLink(this.appConfig.poster_target_url);
        }
    }

    // ============================================
    // EXTERNAL LINK HANDLER (HopWeb Compatible)
    // ============================================

    openExternalLink(url) {
        if (!url || url.trim() === '' || url === '#') {
            return;
        }
        
        try {
            // Method 1: HopWeb API
            if (typeof HopWeb !== 'undefined' && HopWeb.openUrl) {
                HopWeb.openUrl(url);
                return;
            }
            
            // Method 2: Android WebView Interface
            if (typeof Android !== 'undefined' && Android.openExternalLink) {
                Android.openExternalLink(url);
                return;
            }
            
            // Method 3: WebView loadUrl
            if (typeof Android !== 'undefined' && Android.loadUrl) {
                Android.loadUrl(url);
                return;
            }
            
            // Method 4: Window location (for web browsers and some WebViews)
            // Use a hidden iframe to prevent app from closing
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
            
            // Also try window.open
            setTimeout(() => {
                const newWindow = window.open(url, '_system');
                if (!newWindow) {
                    // If popup blocked, use location
                    window.location.href = url;
                }
                // Remove iframe
                document.body.removeChild(iframe);
            }, 100);
            
        } catch (error) {
            console.error('Error opening link:', error);
            // Last resort
            window.location.href = url;
        }
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
                this.splashScreen.style.display = 'none';
            }, 500);
        }, 1500);
    }

    showErrorScreen() {
        this.splashScreen.classList.add('hidden');
        this.appContainer.classList.add('hidden');
        this.errorScreen.classList.remove('hidden');
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
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// ============================================
// INITIALIZE APP
// ============================================

let app = null;

document.addEventListener('DOMContentLoaded', () => {
    app = new MovieApp();
});

// Prevent context menu (optional)
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Prevent pull-to-refresh on mobile (optional)
document.body.addEventListener('touchmove', (e) => {
    if (e.target === document.body) {
        e.preventDefault();
    }
}, { passive: false });
