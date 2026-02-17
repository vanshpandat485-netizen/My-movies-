// js/config.js - Appwrite Configuration

const AppConfig = {
    endpoint: 'https://sgp.cloud.appwrite.io/v1',  // ✅ FIXED: Singapore endpoint
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
    adminPassword: 'admin123', // Change this in production
    debug: true // Enable debug logging
};

// Initialize Appwrite SDK
let client, databases;

try {
    client = new Appwrite.Client();
    client
        .setEndpoint(AppConfig.endpoint)
        .setProject(AppConfig.projectId);
    
    databases = new Appwrite.Databases(client);
    
    if (AppConfig.debug) {
        console.log('✅ Appwrite initialized successfully');
        console.log('📍 Endpoint:', AppConfig.endpoint);
        console.log('📁 Project:', AppConfig.projectId);
        console.log('🗄️ Database:', AppConfig.databaseId);
    }
} catch (error) {
    console.error('❌ Failed to initialize Appwrite:', error);
    alert('Failed to connect to Appwrite. Check console for details.');
}

// Export for use in other files
window.AppConfig = AppConfig;
window.databases = databases;
window.client = client;

// Debug function to test connection
window.testAppwriteConnection = async function() {
    console.log('🔄 Testing Appwrite connection...');
    
    try {
        const result = await databases.listDocuments(
            AppConfig.databaseId,
            AppConfig.collections.movies,
            [Appwrite.Query.limit(1)]
        );
        console.log('✅ Connection successful!');
        console.log('📊 Movies found:', result.total);
        alert(`✅ Connection successful! Found ${result.total} movies.`);
        return true;
    } catch (error) {
        console.error('❌ Connection failed:', error);
        console.error('📋 Error details:', {
            message: error.message,
            code: error.code,
            type: error.type
        });
        
        let errorMsg = 'Connection failed!\n\n';
        
        if (error.code === 404) {
            errorMsg += '❌ Collection not found.\nCreate "movies" collection in Appwrite.';
        } else if (error.code === 401) {
            errorMsg += '❌ Permission denied.\nSet permissions to "Any" with all CRUD rights.';
        } else if (error.message === 'Failed to fetch') {
            errorMsg += '❌ Network error.\nCheck internet connection or endpoint URL.';
        } else {
            errorMsg += `Error: ${error.message}`;
        }
        
        alert(errorMsg);
        return false;
    }
};

console.log('💡 Run testAppwriteConnection() in console to verify setup');
