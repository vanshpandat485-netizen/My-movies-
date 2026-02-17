// js/admin.js - Admin Panel Logic

class AdminPanel {
    constructor() {
        this.isLoggedIn = false;
        this.movies = [];
        this.appConfig = null;
        this.editingMovieId = null;
        
        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.checkLoginState();
    }

    bindElements() {
        // Login
        this.loginScreen = document.getElementById('login-screen');
        this.loginForm = document.getElementById('login-form');
        this.passwordInput = document.getElementById('admin-password');
        this.togglePasswordBtn = document.getElementById('toggle-password');
        this.loginError = document.getElementById('login-error');
        
        // Dashboard
        this.adminDashboard = document.getElementById('admin-dashboard');
        this.sidebar = document.querySelector('.admin-sidebar');
        this.navItems = document.querySelectorAll('.nav-item');
        this.sections = document.querySelectorAll('.admin-section');
        this.pageTitle = document.getElementById('page-title');
        
        // Mobile
        this.menuToggle = document.getElementById('menu-toggle');
        this.logoutBtn = document.getElementById('logout-btn');
        this.logoutMobile = document.getElementById('logout-mobile');
        
        // Dashboard stats
        this.totalMovies = document.getElementById('total-movies');
        this.recentMoviesList = document.getElementById('recent-movies-list');
        
        // Quick actions
        this.quickAddMovie = document.getElementById('quick-add-movie');
        this.quickRefreshCache = document.getElementById('quick-refresh-cache');
        this.quickViewSite = document.getElementById('quick-view-site');
        
        // Movies table
        this.moviesTableBody = document.getElementById('movies-table-body');
        this.movieSearch = document.getElementById('movie-search');
        this.addMovieBtn = document.getElementById('add-movie-btn');
        this.tableEmpty = document.getElementById('table-empty');
        
        // Movie form
        this.movieForm = document.getElementById('movie-form');
        this.formHeading = document.getElementById('form-heading');
        this.movieIdInput = document.getElementById('movie-id');
        this.submitText = document.getElementById('submit-text');
        this.cancelFormBtn = document.getElementById('cancel-form');
        this.posterPreview = document.getElementById('preview-image');
        
        // Ad forms
        this.bannerAdForm = document.getElementById('banner-ad-form');
        this.interstitialAdForm = document.getElementById('interstitial-ad-form');
        this.posterAdForm = document.getElementById('poster-ad-form');
        
        // Settings
        this.refreshCacheBtn = document.getElementById('refresh-cache-btn');
        this.currentCacheVersion = document.getElementById('current-cache-version');
        this.passwordForm = document.getElementById('password-form');
        
        // Modals
        this.editModal = document.getElementById('edit-modal');
        this.deleteModal = document.getElementById('delete-modal');
        this.closeModalBtn = document.getElementById('close-modal');
        this.deleteMovieTitle = document.getElementById('delete-movie-title');
        this.cancelDeleteBtn = document.getElementById('cancel-delete');
        this.confirmDeleteBtn = document.getElementById('confirm-delete');
        
        // Loading & Toast
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.toastContainer = document.getElementById('toast-container');
    }

    bindEvents() {
        // Login
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', () => this.switchSection(item.dataset.section));
        });
        
        // Mobile menu
        this.menuToggle.addEventListener('click', () => this.toggleSidebar());
        
        // Logout
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.logoutMobile.addEventListener('click', () => this.handleLogout());
        
        // Quick actions
        this.quickAddMovie.addEventListener('click', () => this.switchSection('add-movie'));
        this.quickRefreshCache.addEventListener('click', () => this.refreshCache());
        this.quickViewSite.addEventListener('click', () => window.open('index.html', '_blank'));
        
        // Movies
        this.addMovieBtn.addEventListener('click', () => this.switchSection('add-movie'));
        this.movieSearch.addEventListener('input', (e) => this.searchMovies(e.target.value));
        this.movieForm.addEventListener('submit', (e) => this.handleMovieSubmit(e));
        this.cancelFormBtn.addEventListener('click', () => this.resetForm());
        
        // Poster preview
        document.getElementById('movie-poster').addEventListener('input', (e) => {
            this.updatePosterPreview(e.target.value);
        });
        
        // Ad forms
        this.bannerAdForm.addEventListener('submit', (e) => this.saveBannerAd(e));
        this.interstitialAdForm.addEventListener('submit', (e) => this.saveInterstitialAd(e));
        this.posterAdForm.addEventListener('submit', (e) => this.savePosterAd(e));
        
        // Ad previews
        document.getElementById('banner-image-url').addEventListener('input', (e) => {
            this.updateAdPreview('banner-preview', e.target.value);
        });
        document.getElementById('interstitial-image-url').addEventListener('input', (e) => {
            this.updateAdPreview('interstitial-preview', e.target.value);
        });
        document.getElementById('poster-image-url').addEventListener('input', (e) => {
            this.updateAdPreview('poster-ad-preview', e.target.value);
        });
        
        // Settings
        this.refreshCacheBtn.addEventListener('click', () => this.refreshCache());
        this.passwordForm.addEventListener('submit', (e) => this.changePassword(e));
        
        // Modal
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        this.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
        
        // Close sidebar on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                this.sidebar.classList.contains('open') && 
                !this.sidebar.contains(e.target) && 
                e.target !== this.menuToggle) {
                this.sidebar.classList.remove('open');
            }
        });
    }

    // ============================================
    // AUTHENTICATION
    // ============================================

    checkLoginState() {
        const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
        if (isLoggedIn) {
            this.showDashboard();
        }
    }

    handleLogin(e) {
        e.preventDefault();
        
        const password = this.passwordInput.value;
        
        if (password === AppConfig.adminPassword) {
            sessionStorage.setItem('admin_logged_in', 'true');
            this.loginError.classList.add('hidden');
            this.showDashboard();
        } else {
            this.loginError.classList.remove('hidden');
            this.passwordInput.value = '';
            this.passwordInput.focus();
        }
    }

    handleLogout() {
        sessionStorage.removeItem('admin_logged_in');
        this.adminDashboard.classList.add('hidden');
        this.loginScreen.classList.remove('hidden');
        this.passwordInput.value = '';
    }

    togglePasswordVisibility() {
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;
        this.togglePasswordBtn.innerHTML = type === 'password' 
            ? '<i class="fas fa-eye"></i>' 
            : '<i class="fas fa-eye-slash"></i>';
    }

    async showDashboard() {
        this.loginScreen.classList.add('hidden');
        this.adminDashboard.classList.remove('hidden');
        
        // Load data
        await this.loadMovies();
        await this.loadAppConfig();
        this.updateDashboardStats();
    }

    // ============================================
    // DATA LOADING
    // ============================================

    async loadMovies() {
        try {
            this.showLoading();
            
            const response = await databases.listDocuments(
                AppConfig.databaseId,
                AppConfig.collections.movies,
                [
                    Appwrite.Query.orderDesc('$createdAt'),
                    Appwrite.Query.limit(100)
                ]
            );
            
            this.movies = response.documents;
            this.renderMoviesTable();
            this.renderRecentMovies();
            
        } catch (error) {
            console.error('Error loading movies:', error);
            this.showToast('Failed to load movies', 'error');
        } finally {
            this.hideLoading();
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
                this.populateAdForms();
                this.currentCacheVersion.textContent = this.appConfig.cache_version || '1';
            } else {
                // Create default config
                await this.createDefaultConfig();
            }
            
        } catch (error) {
            console.error('Error loading app config:', error);
        }
    }

    async createDefaultConfig() {
        try {
            const response = await databases.createDocument(
                AppConfig.databaseId,
                AppConfig.collections.appConfig,
                'unique()',
                {
                    banner_image_url: '',
                    banner_target_url: '',
                    interstitial_image_url: '',
                    interstitial_target_url: '',
                    poster_image_url: '',
                    poster_target_url: '',
                    cache_version: '1'
                }
            );
            
            this.appConfig = response;
            
        } catch (error) {
            console.error('Error creating default config:', error);
        }
    }

    populateAdForms() {
        if (!this.appConfig) return;
        
        // Banner Ad
        document.getElementById('banner-image-url').value = this.appConfig.banner_image_url || '';
        document.getElementById('banner-target-url').value = this.appConfig.banner_target_url || '';
        this.updateAdPreview('banner-preview', this.appConfig.banner_image_url);
        
        // Interstitial Ad
        document.getElementById('interstitial-image-url').value = this.appConfig.interstitial_image_url || '';
        document.getElementById('interstitial-target-url').value = this.appConfig.interstitial_target_url || '';
        this.updateAdPreview('interstitial-preview', this.appConfig.interstitial_image_url);
        
        // Permanent Poster Ad
        document.getElementById('poster-image-url').value = this.appConfig.poster_image_url || '';
        document.getElementById('poster-target-url').value = this.appConfig.poster_target_url || '';
        this.updateAdPreview('poster-ad-preview', this.appConfig.poster_image_url);
    }

    // ============================================
    // NAVIGATION
    // ============================================

    switchSection(sectionId) {
        // Update nav items
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });
        
        // Update sections
        this.sections.forEach(section => {
            section.classList.toggle('hidden', section.id !== `section-${sectionId}`);
            section.classList.toggle('active', section.id === `section-${sectionId}`);
        });
        
        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'movies': 'Movies Management',
            'add-movie': 'Add Movie',
            'ads': 'Ad Controller',
            'settings': 'Settings'
        };
        this.pageTitle.textContent = titles[sectionId] || 'Dashboard';
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            this.sidebar.classList.remove('open');
        }
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('open');
    }

    // ============================================
    // MOVIES MANAGEMENT
    // ============================================

    renderMoviesTable(movies = this.movies) {
        if (movies.length === 0) {
            this.moviesTableBody.innerHTML = '';
            this.tableEmpty.classList.remove('hidden');
            return;
        }
        
        this.tableEmpty.classList.add('hidden');
        
        this.moviesTableBody.innerHTML = movies.map(movie => `
            <tr>
                <td>
                    <img src="${movie.poster_url}" alt="${movie.title}" class="table-poster"
                         onerror="this.src='https://via.placeholder.com/50x75?text=No+Image'">
                </td>
                <td>${movie.title}</td>
                <td>${movie.year || 'N/A'}</td>
                <td>
                    <span style="color: #f5c518;">
                        <i class="fas fa-star"></i> ${movie.rating || 'N/A'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="edit-btn" onclick="admin.editMovie('${movie.$id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn-small" onclick="admin.showDeleteModal('${movie.$id}', '${movie.title.replace(/'/g, "\\'")}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderRecentMovies() {
        const recent = this.movies.slice(0, 5);
        
        if (recent.length === 0) {
            this.recentMoviesList.innerHTML = '<p class="text-muted">No movies added yet</p>';
            return;
        }
        
        this.recentMoviesList.innerHTML = recent.map(movie => `
            <div class="recent-item">
                <img src="${movie.poster_url}" alt="${movie.title}"
                     onerror="this.src='https://via.placeholder.com/50x75?text=No+Image'">
                <div class="recent-info">
                    <h4>${movie.title}</h4>
                    <p>${movie.year || 'N/A'} • ${movie.rating || 'N/A'} ★</p>
                </div>
            </div>
        `).join('');
    }

    updateDashboardStats() {
        this.totalMovies.textContent = this.movies.length;
    }

    searchMovies(query) {
        query = query.toLowerCase().trim();
        
        if (query === '') {
            this.renderMoviesTable();
            return;
        }
        
        const filtered = this.movies.filter(movie => 
            movie.title.toLowerCase().includes(query)
        );
        
        this.renderMoviesTable(filtered);
    }

    async handleMovieSubmit(e) {
        e.preventDefault();
        
        const movieData = {
            title: document.getElementById('movie-title').value,
            description: document.getElementById('movie-description').value,
            poster_url: document.getElementById('movie-poster').value,
            year: parseInt(document.getElementById('movie-year').value),
            rating: parseFloat(document.getElementById('movie-rating').value),
            category: document.getElementById('movie-category').value,
            duration: document.getElementById('movie-duration').value,
            download_480p: document.getElementById('download-480p').value,
            download_720p: document.getElementById('download-720p').value,
            download_1080p: document.getElementById('download-1080p').value
        };
        
        try {
            this.showLoading();
            
            if (this.editingMovieId) {
                // Update existing movie
                await databases.updateDocument(
                    AppConfig.databaseId,
                    AppConfig.collections.movies,
                    this.editingMovieId,
                    movieData
                );
                
                this.showToast('Movie updated successfully', 'success');
            } else {
                // Create new movie
                await databases.createDocument(
                    AppConfig.databaseId,
                    AppConfig.collections.movies,
                    'unique()',
                    movieData
                );
                
                this.showToast('Movie added successfully', 'success');
            }
            
            // Reload movies and reset form
            await this.loadMovies();
            this.resetForm();
            this.switchSection('movies');
            
        } catch (error) {
            console.error('Error saving movie:', error);
            this.showToast('Failed to save movie', 'error');
        } finally {
            this.hideLoading();
        }
    }

    editMovie(movieId) {
        const movie = this.movies.find(m => m.$id === movieId);
        
        if (!movie) {
            this.showToast('Movie not found', 'error');
            return;
        }
        
        this.editingMovieId = movieId;
        
        // Populate form
        this.movieIdInput.value = movieId;
        document.getElementById('movie-title').value = movie.title || '';
        document.getElementById('movie-description').value = movie.description || '';
        document.getElementById('movie-poster').value = movie.poster_url || '';
        document.getElementById('movie-year').value = movie.year || '';
        document.getElementById('movie-rating').value = movie.rating || '';
        document.getElementById('movie-category').value = movie.category || 'action';
        document.getElementById('movie-duration').value = movie.duration || '';
        document.getElementById('download-480p').value = movie.download_480p || '';
        document.getElementById('download-720p').value = movie.download_720p || '';
        document.getElementById('download-1080p').value = movie.download_1080p || '';
        
        // Update preview
        this.updatePosterPreview(movie.poster_url);
        
        // Update form heading
        this.formHeading.textContent = 'Edit Movie';
        this.submitText.textContent = 'Update Movie';
        
        // Switch to form section
        this.switchSection('add-movie');
    }

    showDeleteModal(movieId, movieTitle) {
        this.movieToDelete = movieId;
        this.deleteMovieTitle.textContent = movieTitle;
        this.deleteModal.classList.remove('hidden');
    }

    closeDeleteModal() {
        this.deleteModal.classList.add('hidden');
        this.movieToDelete = null;
    }

    async confirmDelete() {
        if (!this.movieToDelete) return;
        
        try {
            this.showLoading();
            
            await databases.deleteDocument(
                AppConfig.databaseId,
                AppConfig.collections.movies,
                this.movieToDelete
            );
            
            this.showToast('Movie deleted successfully', 'success');
            await this.loadMovies();
            this.closeDeleteModal();
            
        } catch (error) {
            console.error('Error deleting movie:', error);
            this.showToast('Failed to delete movie', 'error');
        } finally {
            this.hideLoading();
        }
    }

    resetForm() {
        this.editingMovieId = null;
        this.movieForm.reset();
        this.movieIdInput.value = '';
        this.formHeading.textContent = 'Add New Movie';
        this.submitText.textContent = 'Add Movie';
        this.posterPreview.classList.remove('loaded');
    }

    updatePosterPreview(url) {
        if (url) {
            this.posterPreview.src = url;
            this.posterPreview.classList.add('loaded');
        } else {
            this.posterPreview.classList.remove('loaded');
        }
    }

    // ============================================
    // AD MANAGEMENT
    // ============================================

    updateAdPreview(previewId, url) {
        const preview = document.getElementById(previewId);
        const img = preview.querySelector('img');
        
        if (url) {
            img.src = url;
        } else {
            img.src = '';
        }
    }

    async saveBannerAd(e) {
        e.preventDefault();
        
        const data = {
            banner_image_url: document.getElementById('banner-image-url').value,
            banner_target_url: document.getElementById('banner-target-url').value
        };
        
        await this.updateAppConfig(data, 'Banner ad saved successfully');
    }

    async saveInterstitialAd(e) {
        e.preventDefault();
        
        const data = {
            interstitial_image_url: document.getElementById('interstitial-image-url').value,
            interstitial_target_url: document.getElementById('interstitial-target-url').value
        };
        
        await this.updateAppConfig(data, 'Interstitial ad saved successfully');
    }

    async savePosterAd(e) {
        e.preventDefault();
        
        const data = {
            poster_image_url: document.getElementById('poster-image-url').value,
            poster_target_url: document.getElementById('poster-target-url').value
        };
        
        await this.updateAppConfig(data, 'Poster ad saved successfully');
    }

    async updateAppConfig(data, successMessage) {
        if (!this.appConfig) {
            this.showToast('Configuration not loaded', 'error');
            return;
        }
        
        try {
            this.showLoading();
            
            await databases.updateDocument(
                AppConfig.databaseId,
                AppConfig.collections.appConfig,
                this.appConfig.$id,
                data
            );
            
            // Update local config
            Object.assign(this.appConfig, data);
            
            this.showToast(successMessage, 'success');
            
        } catch (error) {
            console.error('Error updating app config:', error);
            this.showToast('Failed to save configuration', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ============================================
    // CACHE MANAGEMENT
    // ============================================

    async refreshCache() {
        if (!this.appConfig) {
            this.showToast('Configuration not loaded', 'error');
            return;
        }
        
        try {
            this.showLoading();
            
            // Increment cache version
            const newVersion = (parseInt(this.appConfig.cache_version || '0') + 1).toString();
            
            await databases.updateDocument(
                AppConfig.databaseId,
                AppConfig.collections.appConfig,
                this.appConfig.$id,
                { cache_version: newVersion }
            );
            
            this.appConfig.cache_version = newVersion;
            this.currentCacheVersion.textContent = newVersion;
            
            this.showToast('Cache refreshed! All users will fetch new data.', 'success');
            
        } catch (error) {
            console.error('Error refreshing cache:', error);
            this.showToast('Failed to refresh cache', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ============================================
    // PASSWORD MANAGEMENT
    // ============================================

    changePassword(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (currentPassword !== AppConfig.adminPassword) {
            this.showToast('Current password is incorrect', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showToast('New passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        // In a real app, you would save this to a secure backend
        // For this demo, we'll just update the local config
        AppConfig.adminPassword = newPassword;
        
        this.showToast('Password changed successfully', 'success');
        this.passwordForm.reset();
    }

    // ============================================
    // MODAL MANAGEMENT
    // ============================================

    closeModal() {
        this.editModal.classList.add('hidden');
    }

    // ============================================
    // UI HELPERS
    // ============================================

    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
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
        
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize admin panel
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new AdminPanel();
});
