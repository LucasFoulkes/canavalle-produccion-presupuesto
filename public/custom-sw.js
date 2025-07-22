// Custom Service Worker for better offline support
// This will be injected into the Workbox-generated service worker

// This is required for workbox to inject the precache manifest
self.__WB_MANIFEST;

// Force update on page load
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Handle fetch events for navigation requests
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only handle navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // If fetch fails (offline), try to return cached index.html
                    return caches.match('/index.html')
                        .then(response => {
                            // If we have a cached index.html, return it
                            if (response) {
                                return response;
                            }

                            // If no cached index.html, try the offline page
                            return caches.match('/offline.html');
                        });
                })
        );
    }
});

// Log when the service worker is installed
self.addEventListener('install', (event) => {
    console.log('Custom service worker installed');
});

// Log when the service worker is activated
self.addEventListener('activate', (event) => {
    console.log('Custom service worker activated');

    // Claim clients immediately
    event.waitUntil(self.clients.claim());
});