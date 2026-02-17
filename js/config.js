// js/config.js - Appwrite Configuration

const AppConfig = {
  endpoint: 'https://cloud.appwrite.io/v1',
  projectId: '69921d010019e2d80f37',
  databaseId: '69926a04003e2dda63d6',
  collections: {
    movies: 'movies',
    appConfig: 'app_config'
  },
  cacheKeys: {
    movies: 'movies_cache',
    moviesTimestamp: 'movies_cache_timestamp',
    appConfig: 'app_config_cache',
    cacheVersion: 'cache_version'
  },
  cacheDuration: 3 * 60 * 60 * 1000, // 3 hours in milliseconds
  adminPassword: 'admin123' // Change this in production
};

// Initialize Appwrite SDK
const client = new Appwrite.Client();
client
  .setEndpoint(AppConfig.endpoint)
  .setProject(AppConfig.projectId);

const databases = new Appwrite.Databases(client);

// Export for use in other files
window.AppConfig = AppConfig;
window.databases = databases;
