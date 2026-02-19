
// js/config.js - Appwrite Configuration for HopWeb App

const AppConfig = {
  // Appwrite Settings
  endpoint: 'https://sgp.cloud.appwrite.io/v1',
  projectId: '69921d010019e2d80f37',
  databaseId: '69926a04003e2dda63d6',
  
  // Collection IDs
  collections: {
    movies: 'movies',
    appConfig: 'app_config'
  },
  
  // Cache Settings
  cacheKeys: {
    movies: 'movies_cache',
    moviesTimestamp: 'movies_cache_timestamp',
    appConfig: 'app_config_cache',
    cacheVersion: 'cache_version'
  },
  
  // Cache duration: 3 hours in milliseconds
  cacheDuration: 3 * 60 * 60 * 1000,
  
  // App Settings
  appName: 'FilmyMaxz',
  debug: false
};

// Initialize Appwrite SDK
let client = null;
let databases = null;

try {
  client = new Appwrite.Client();
  client
    .setEndpoint(AppConfig.endpoint)
    .setProject(AppConfig.projectId);
  
  databases = new Appwrite.Databases(client);
  
  if (AppConfig.debug) {
    console.log('✅ Appwrite initialized');
    console.log('📍 Endpoint:', AppConfig.endpoint);
    console.log('📁 Project:', AppConfig.projectId);
  }
} catch (error) {
  console.error('❌ Appwrite initialization failed:', error);
}

// Export globally
window.AppConfig = AppConfig;
window.client = client;
window.databases = databases;
