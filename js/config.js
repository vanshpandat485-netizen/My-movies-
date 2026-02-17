// ==================================================
// APPWRITE CONFIGURATION - UPDATED
// ==================================================

const CONFIG = {
  // Appwrite Settings
  appwrite: {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '69921d010019e2d80f37',
    databaseId: '69926a04003e2dda63d6',
    collections: {
      movies: 'movies',
      appConfig: 'app_config'
    }
  },
  
  // Cache Settings
  cache: {
    moviesKey: 'movies_cache',
    configKey: 'app_config_cache',
    duration: 3 * 60 * 60 * 1000, // 3 hours in milliseconds
    versionKey: 'cache_version'
  },
  
  // Admin Settings
  admin: {
    password: 'admin@123', // Change this in production
    sessionKey: 'admin_session'
  },
  
  // Ad Settings
  ads: {
    interstitialDelay: 5000 // 5 seconds countdown
  },
  
  // Debug Mode
  debug: false
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
