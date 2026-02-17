// ==================================================
// MOVIEFLIX - ADMIN PANEL SCRIPT
// ==================================================

// Appwrite Client Initialization
const client = new Appwrite.Client();
const databases = new Appwrite.Databases(client);

client
    .setEndpoint(CONFIG.appwrite.endpoint)
    .setProject(CONFIG.appwrite.projectId);

// ==================================================
// ADMIN STATE
// ==================================================

const AdminState = {
    isLoggedIn: false,
    movies: [],
    appConfig: null,
    configDocId: null
};

// ==================================================
// DOM ELEMENTS
// ==================================================

const Elements = {
    // Auth
    loginScreen: document.getElementById('loginScreen'),
    loginForm: document.getElementById('loginForm'),
    passwordInput: document.getElementById('password'),
    
    // Dashboard
    adminDashboard: document.getElementById('adminDashboard'),
    logoutBtn: document.getElementById('logoutBtn'),
    refreshCacheBtn: document.getElementById('refreshCacheBtn'),
    
    // Stats
    totalMovies: document.getElementById('totalMovies'),
    cacheStatus: document.getElementById('cacheStatus'),
    lastUpdated: document.getElementById('lastUpdated'),
    
    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    moviesTab: document.getElementById('moviesTab'),
    adsTab: document.getElementById('adsTab'),
    
    // Movies
    addMovieForm: document.getElementById('addMovieForm'),
    moviesTableBody: document.getElementById('moviesTableBody'),
    
    // Edit Modal
    editModal: document.getElementById('editModal'),
    editMovieForm: document.getElementById('editMovieForm'),
    closeEditModal: document.getElementById('closeEditModal'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    
    // Ads
    bannerAdForm: document.getElementById('bannerAdForm'),
    bannerImageUrl: document.getElementById('bannerImageUrl'),
    bannerTargetUrl: document.getElementById('bannerTargetUrl'),
    bannerPreview: document.getElementById('bannerPreview'),
    bannerNoPreview: document.getElementById('bannerNoPreview'),
    
    interstitialAdForm: document.getElementById('interstitialAdForm'),
    interstitialImageUrl: document.getElementById('interstitialImageUrl'),
    interstitialTargetUrl: document.getElementById('interstitialTargetUrl'),
    interstitialPreview: document.getElementById('interstitialPreview'),
    interstitialNoPreview: document.getElementById('interstitialNoPreview'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    Elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================================================
// AUTHENTICATION
// ==================================================

const Auth = {
    /**
     * Check if user is logged in
     */
    checkSession() {
        const session = sessionStorage.getItem(CONFIG.admin.sessionKey);
        return session === 'active';
    },

    /**
     * Handle login
     */
    login(password) {
        if (password === CONFIG.admin.password) {
            sessionStorage.setItem(CONFIG.admin.sessionKey, 'active');
            AdminState.isLoggedIn = true;
            this.showDashboard();
            return true;
        }
        return false;
    },

    /**
     * Handle logout
     */
    logout() {
        sessionStorage.removeItem(CONFIG.admin.sessionKey);
        AdminState.isLoggedIn = false;
        Elements.adminDashboard.classList.remove('active');
        Elements.loginScreen.style.display = 'flex';
        Elements.passwordInput.value = '';
    },

    /**
     * Show dashboard after login
     */
    showDashboard() {
        Elements.loginScreen.style.display = 'none';
        Elements.adminDashboard.classList.add('active');
        Dashboard.init();
    }
};

// ==================================================
// DASHBOARD
// ==================================================

const Dashboard = {
    /**
     * Initialize dashboard
     */
    async init() {
        await Promise.all([
            this.loadMovies(),
            this.loadAppConfig()
        ]);
        this.updateStats();
    },

    /**
     * Load movies from Appwrite
     */
    async loadMovies() {
        try {
            const response = await databases.listDocuments(
                CONFIG.appwrite.databaseId,
                CONFIG.appwrite.collections.movies,
                [
                    Appwrite.Query.orderDesc('$createdAt'),
                    Appwrite.Query.limit(100)
                ]
            );
            
            AdminState.movies = response.documents;
            this.renderMoviesTable();
        } catch (error) {
            console.error('Failed to load movies:', error);
            showToast('Failed to load movies', 'error');
        }
    },

    /**
     * Load app configuration
     */
    async loadAppConfig() {
        try {
            const response = await databases.listDocuments(
                CONFIG.appwrite.databaseId,
                CONFIG.appwrite.collections.appConfig,
                [Appwrite.Query.limit(1)]
            );
            
            if (response.documents.length > 0) {
                AdminState.appConfig = response.documents[0];
                AdminState.configDocId = response.documents[0].$id;
                this.populateAdForms();
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    },

    /**
     * Update statistics display
     */
    updateStats() {
        Elements.totalMovies.textContent = AdminState.movies.length;
        Elements.cacheStatus.textContent = 'Active';
        
        if (AdminState.movies.length > 0) {
            const lastMovie = AdminState.movies[0];
            Elements.lastUpdated.textContent = formatDate(lastMovie.$createdAt);
        }
    },

    /**
     * Render movies table
     */
    renderMoviesTable() {
        if (AdminState.movies.length === 0) {
            Elements.moviesTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        No movies found. Add your first movie above!
                    </td>
                </tr>
            `;
            return;
        }

        Elements.moviesTableBody.innerHTML = AdminState.movies.map(movie => `
            <tr>
                <td>
                    <img 
                        src="${movie.poster_url || 'https://via.placeholder.com/50x75?text=No+Poster'}" 
                        alt="${movie.title}"
                        onerror="this.src='https://via.placeholder.com/50x75?text=Error';"
                    >
                </td>
                <td>${movie.title}</td>
                <td>${movie.year || '-'}</td>
                <td>${movie.rating || '-'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-small" onclick="Movies.openEditModal('${movie.$id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-danger btn-small" onclick="Movies.deleteMovie('${movie.$id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    /**
     * Populate ad forms with existing data
     */
    populateAdForms() {
        if (!AdminState.appConfig) return;

        const config = AdminState.appConfig;
        
        // Banner Ad
        Elements.bannerImageUrl.value = config.banner_image_url || '';
        Elements.bannerTargetUrl.value = config.banner_target_url || '';
        this.updateBannerPreview(config.banner_image_url);
        
        // Interstitial Ad
        Elements.interstitialImageUrl.value = config.interstitial_image_url || '';
        Elements.interstitialTargetUrl.value = config.interstitial_target_url || '';
        this.updateInterstitialPreview(config.interstitial_image_url);
    },

    /**
     * Update banner preview
     */
    updateBannerPreview(url) {
        if (url) {
            Elements.bannerPreview.src = url;
            Elements.bannerPreview.style.display = 'block';
            Elements.bannerNoPreview.style.display = 'none';
        } else {
            Elements.bannerPreview.style.display = 'none';
            Elements.bannerNoPreview.style.display = 'block';
        }
    },

    /**
     * Update interstitial preview
     */
    updateInterstitialPreview(url) {
        if (url) {
            Elements.interstitialPreview.src = url;
            Elements.interstitialPreview.style.display = 'block';
            Elements.interstitialNoPreview.style.display = 'none';
        } else {
            Elements.interstitialPreview.style.display = 'none';
            Elements.interstitialNoPreview.style.display = 'block';
        }
    }
};

// ==================================================
// MOVIES CRUD
// ==================================================

const Movies = {
    /**
     * Add new movie
     */
    async addMovie(formData) {
        try {
            const movieData = {
                title: formData.get('title'),
                year: formData.get('year') ? parseInt(formData.get('year')) : null,
                rating: formData.get('rating') ? parseFloat(formData.get('rating')) : null,
                poster_url: formData.get('poster_url'),
                description: formData.get('description') || null,
                download_480p: formData.get('download_480p') || null,
                download_720p: formData.get('download_720p') || null,
                download_1080p: formData.get('download_1080p') || null
            };

            await databases.createDocument(
                CONFIG.appwrite.databaseId,
                CONFIG.appwrite.collections.movies,
                Appwrite.ID.unique(),
                movieData
            );

            showToast('Movie added successfully!', 'success');
            Elements.addMovieForm.reset();
            await Dashboard.loadMovies();
            Dashboard.updateStats();
            this.invalidateCache();
        } catch (error) {
            console.error('Failed to add movie:', error);
            showToast('Failed to add movie: ' + error.message, 'error');
        }
    },

    /**
     * Open edit modal
     */
    openEditModal(movieId) {
        const movie = AdminState.movies.find(m => m.$id === movieId);
        if (!movie) return;

        document.getElementById('editMovieId').value = movie.$id;
        document.getElementById('editTitle').value = movie.title;
        document.getElementById('editYear').value = movie.year || '';
        document.getElementById('editRating').value = movie.rating || '';
        document.getElementById('editPoster').value = movie.poster_url || '';
        document.getElementById('editDescription').value = movie.description || '';
        document.getElementById('editDownload480p').value = movie.download_480p || '';
        document.getElementById('editDownload720p').value = movie.download_720p || '';
        document.getElementById('editDownload1080p').value = movie.download_1080p || '';

        Elements.editModal.classList.add('active');
    },

    /**
     * Close edit modal
     */
    closeEditModal() {
        Elements.editModal.classList.remove('active');
        Elements.editMovieForm.reset();
    },

    /**
     * Update movie
     */
    async updateMovie(movieId, formData) {
        try {
            const movieData = {
                title: formData.get('title'),
                year: formData.get('year') ? parseInt(formData.get('year')) : null,
                rating: formData.get('rating') ? parseFloat(formData.get('rating')) : null,
                poster_url: formData.get('poster_url'),
                description: formData.get('description') || null,
                download_480p: formData.get('download_480p') || null,
                download_720p: formData.get('download_720p') || null,
                download_1080p: formData.get('download_1080p') || null
            };

            await databases.updateDocument(
                CONFIG.appwrite.databaseId,
                CONFIG.appwrite.collections.movies,
                movieId,
                movieData
            );

            showToast('Movie updated successfully!', 'success');
            this.closeEditModal();
            await Dashboard.loadMovies();
            this.invalidateCache();
        } catch (error) {
            console.error('Failed to update movie:', error);
            showToast('Failed to update movie: ' + error.message, 'error');
        }
    },

    /**
     * Delete movie
     */
    async deleteMovie(movieId) {
        if (!confirm('Are you sure you want to delete this movie?')) return;

        try {
            await databases.deleteDocument(
                CONFIG.appwrite.databaseId,
                CONFIG.appwrite.collections.movies,
                movieId
            );

            showToast('Movie deleted successfully!', 'success');
            await Dashboard.loadMovies();
            Dashboard.updateStats();
            this.invalidateCache();
        } catch (error) {
            console.error('Failed to delete movie:', error);
            showToast('Failed to delete movie: ' + error.message, 'error');
        }
    },

    /**
     * Invalidate user cache
     */
    invalidateCache() {
        const newVersion = Date.now().toString();
        localStorage.setItem(CONFIG.cache.versionKey, newVersion);
    }
};

// ==================================================
// ADS MANAGEMENT
// ==================================================

const Ads = {
    /**
     * Save banner ad settings
     */
    async saveBannerAd(imageUrl, targetUrl) {
        try {
            const data = {
                banner_image_url: imageUrl || null,
                banner_target_url: targetUrl || null
            };

            if (AdminState.configDocId) {
                await databases.updateDocument(
                    CONFIG.appwrite.databaseId,
                    CONFIG.appwrite.collections.appConfig,
                    AdminState.configDocId,
                    data
                );
            } else {
                const response = await databases.createDocument(
                    CONFIG.appwrite.databaseId,
                    CONFIG.appwrite.collections.appConfig,
                    Appwrite.ID.unique(),
                    data
                );
                AdminState.configDocId = response.$id;
            }

            showToast('Banner ad saved successfully!', 'success');
            Dashboard.updateBannerPreview(imageUrl);
            Movies.invalidateCache();
        } catch (error) {
            console.error('Failed to save banner ad:', error);
            showToast('Failed to save banner ad: ' + error.message, 'error');
        }
    },

    /**
     * Save interstitial ad settings
     */
    async saveInterstitialAd(imageUrl, targetUrl) {
        try {
            const data = {
                interstitial_image_url: imageUrl || null,
                interstitial_target_url: targetUrl || null
            };

            if (AdminState.configDocId) {
                await databases.updateDocument(
                    CONFIG.appwrite.databaseId,
                    CONFIG.appwrite.collections.appConfig,
                    AdminState.configDocId,
                    data
                );
            } else {
                const response = await databases.createDocument(
                    CONFIG.appwrite.databaseId,
                    CONFIG.appwrite.collections.appConfig,
                    Appwrite.ID.unique(),
                    data
                );
                AdminState.configDocId = response.$id;
            }

            showToast('Interstitial ad saved successfully!', 'success');
            Dashboard.updateInterstitialPreview(imageUrl);
            Movies.invalidateCache();
        } catch (error) {
            console.error('Failed to save interstitial ad:', error);
            showToast('Failed to save interstitial ad: ' + error.message, 'error');
        }
    },

    /**
     * Force refresh cache for all users
     */
    forceRefreshCache() {
        const newVersion = Date.now().toString();
        localStorage.setItem(CONFIG.cache.versionKey, newVersion);
        showToast('Cache version updated! Users will fetch fresh data.', 'success');
    }
};

// ==================================================
// EVENT LISTENERS
// ==================================================

// Login Form
Elements.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = Elements.passwordInput.value;
    
    if (Auth.login(password)) {
        showToast('Welcome, Admin!', 'success');
    } else {
        showToast('Invalid password!', 'error');
        Elements.passwordInput.value = '';
        Elements.passwordInput.focus();
    }
});

// Logout Button
Elements.logoutBtn.addEventListener('click', () => {
    Auth.logout();
    showToast('Logged out successfully', 'info');
});

// Refresh Cache Button
Elements.refreshCacheBtn.addEventListener('click', () => {
    Ads.forceRefreshCache();
});

// Tab Navigation
Elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update button states
        Elements.tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update tab visibility
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    });
});

// Add Movie Form
Elements.addMovieForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    formData.set('title', document.getElementById('movieTitle').value);
    formData.set('year', document.getElementById('movieYear').value);
    formData.set('rating', document.getElementById('movieRating').value);
    formData.set('poster_url', document.getElementById('moviePoster').value);
    formData.set('description', document.getElementById('movieDescription').value);
    formData.set('download_480p', document.getElementById('download480p').value);
    formData.set('download_720p', document.getElementById('download720p').value);
    formData.set('download_1080p', document.getElementById('download1080p').value);
    
    await Movies.addMovie(formData);
});

// Edit Movie Form
Elements.editMovieForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const movieId = document.getElementById('editMovieId').value;
    const formData = new FormData();
    
    formData.set('title', document.getElementById('editTitle').value);
    formData.set('year', document.getElementById('editYear').value);
    formData.set('rating', document.getElementById('editRating').value);
    formData.set('poster_url', document.getElementById('editPoster').value);
    formData.set('description', document.getElementById('editDescription').value);
    formData.set('download_480p', document.getElementById('editDownload480p').value);
    formData.set('download_720p', document.getElementById('editDownload720p').value);
    formData.set('download_1080p', document.getElementById('editDownload1080p').value);
    
    await Movies.updateMovie(movieId, formData);
});

// Close Edit Modal
Elements.closeEditModal.addEventListener('click', () => Movies.closeEditModal());
Elements.cancelEditBtn.addEventListener('click', () => Movies.closeEditModal());

// Banner Ad Form
Elements.bannerAdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await Ads.saveBannerAd(
        Elements.bannerImageUrl.value,
        Elements.bannerTargetUrl.value
    );
});

// Banner Image Preview
Elements.bannerImageUrl.addEventListener('input', (e) => {
    Dashboard.updateBannerPreview(e.target.value);
});

// Interstitial Ad Form
Elements.interstitialAdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await Ads.saveInterstitialAd(
        Elements.interstitialImageUrl.value,
        Elements.interstitialTargetUrl.value
    );
});

// Interstitial Image Preview
Elements.interstitialImageUrl.addEventListener('input', (e) => {
    Dashboard.updateInterstitialPreview(e.target.value);
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && Elements.editModal.classList.contains('active')) {
        Movies.closeEditModal();
    }
});

// Close modal on background click
Elements.editModal.addEventListener('click', (e) => {
    if (e.target === Elements.editModal) {
        Movies.closeEditModal();
    }
});

// ==================================================
// INITIALIZE
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check for existing session
    if (Auth.checkSession()) {
        Auth.showDashboard();
    }
});
