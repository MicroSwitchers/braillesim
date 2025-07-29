const CACHE_NAME = 'braille-writer-v1.0.1';
const STATIC_CACHE_NAME = 'braille-writer-static-v1.0.1';
const DYNAMIC_CACHE_NAME = 'braille-writer-dynamic-v1.0.1';

// Files to cache for offline functionality
const STATIC_FILES = [
  './index.html',
  './script.js',
  './styles.css',
  './manifest.json',
  './mbw.svg?v=1.0.1',
  './ding.wav',
  './key.wav',
  './linespace.wav',
  './space.wav',
  './updown.wav'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static files...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        // Force the service worker to become active immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated successfully');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html')
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request);
        })
        .catch(() => {
          // Return cached index.html for offline navigation
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Handle static file requests
  if (STATIC_FILES.some(file => event.request.url.includes(file.replace('./', '')))) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If not in cache, fetch and cache
          return fetch(event.request)
            .then((networkResponse) => {
              // Clone the response because it can only be used once
              const responseClone = networkResponse.clone();
              
              caches.open(STATIC_CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
              
              return networkResponse;
            });
        })
        .catch(() => {
          console.log('Failed to fetch:', event.request.url);
          // Return a fallback response for essential files
          if (event.request.url.includes('.html')) {
            return caches.match('./index.html');
          }
        })
    );
    return;
  }

  // Handle other requests with network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fall back to cache
        return caches.match(event.request);
      })
  );
});

// Handle background sync for data persistence
self.addEventListener('sync', (event) => {
  if (event.tag === 'braille-data-sync') {
    event.waitUntil(
      // Sync braille data when online
      syncBrailleData()
    );
  }
});

// Handle push notifications (for future features)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Braille Writer update available',
    icon: './mbw.svg?v=1.0.1',
    badge: './mbw.svg?v=1.0.1',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: './mbw.svg?v=1.0.1'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './mbw.svg?v=1.0.1'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Braille Writer', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./index.html')
    );
  }
});

// Sync function for background data sync
async function syncBrailleData() {
  try {
    // This could sync saved braille documents to a server
    console.log('Syncing braille data...');
    
    // Get stored data from IndexedDB or localStorage
    const storedData = await getStoredBrailleData();
    
    if (storedData && storedData.length > 0) {
      // Send data to server when online
      // await sendToServer(storedData);
      console.log('Braille data synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync braille data:', error);
  }
}

// Helper function to get stored braille data
async function getStoredBrailleData() {
  // This would retrieve data from IndexedDB
  // For now, return empty array
  return [];
}

// Message handling for communication with main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_BRAILLE_DATA') {
    // Cache braille document data
    caches.open(DYNAMIC_CACHE_NAME)
      .then((cache) => {
        const response = new Response(JSON.stringify(event.data.payload));
        cache.put('./braille-data.json', response);
      });
  }
});
