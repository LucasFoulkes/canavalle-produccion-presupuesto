// Script to test offline functionality
// This can be loaded in the browser console to test offline capabilities

(function () {
    console.log('=== Testing Offline Functionality ===');

    // Check if service worker is registered
    async function checkServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                console.log('Service Worker registered:', !!registration);
                if (registration) {
                    console.log('Service Worker state:', registration.active?.state);
                    console.log('Service Worker scope:', registration.scope);
                }
                return !!registration;
            } catch (err) {
                console.error('Error checking service worker:', err);
                return false;
            }
        } else {
            console.log('Service Worker not supported');
            return false;
        }
    }

    // Check if cache is available
    async function checkCache() {
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                console.log('Cache names:', cacheNames);

                if (cacheNames.length > 0) {
                    // Check if index.html is cached
                    for (const cacheName of cacheNames) {
                        const cache = await caches.open(cacheName);
                        const keys = await cache.keys();
                        console.log(`Cache ${cacheName} has ${keys.length} entries`);

                        // Check for important files
                        const indexHtml = await cache.match('/index.html') || await cache.match('/');
                        const offlineHtml = await cache.match('/offline.html');

                        console.log(`index.html cached: ${!!indexHtml}`);
                        console.log(`offline.html cached: ${!!offlineHtml}`);
                    }
                    return true;
                }
                return false;
            } catch (err) {
                console.error('Error checking cache:', err);
                return false;
            }
        } else {
            console.log('Cache API not supported');
            return false;
        }
    }

    // Check IndexedDB
    async function checkIndexedDB() {
        try {
            const databases = await window.indexedDB.databases();
            console.log('IndexedDB databases:', databases);

            // Open AppDB
            return new Promise((resolve) => {
                const request = indexedDB.open('AppDB');

                request.onsuccess = function (event) {
                    const db = event.target.result;
                    const tableNames = Array.from(db.objectStoreNames);
                    console.log('IndexedDB tables:', tableNames);

                    // Check if we have data in tables
                    const transaction = db.transaction(tableNames, 'readonly');

                    let tablesWithData = 0;

                    tableNames.forEach(tableName => {
                        const objectStore = transaction.objectStore(tableName);
                        const countRequest = objectStore.count();

                        countRequest.onsuccess = function () {
                            console.log(`Table ${tableName} has ${countRequest.result} records`);
                            if (countRequest.result > 0) {
                                tablesWithData++;
                            }

                            if (tableName === tableNames[tableNames.length - 1]) {
                                console.log(`Tables with data: ${tablesWithData}/${tableNames.length}`);
                                resolve(tablesWithData > 0);
                            }
                        };
                    });

                    if (tableNames.length === 0) {
                        resolve(false);
                    }
                };

                request.onerror = function () {
                    console.error('Error opening IndexedDB');
                    resolve(false);
                };
            });
        } catch (err) {
            console.error('Error checking IndexedDB:', err);
            return false;
        }
    }

    // Check if running as PWA
    function checkIfPWA() {
        const isPWA =
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');

        console.log('Running as PWA:', isPWA);
        return isPWA;
    }

    // Run all tests
    async function runTests() {
        const swRegistered = await checkServiceWorker();
        const cacheAvailable = await checkCache();
        const indexedDBAvailable = await checkIndexedDB();
        const isPWA = checkIfPWA();

        console.log('=== Test Results ===');
        console.log('Service Worker registered:', swRegistered);
        console.log('Cache available:', cacheAvailable);
        console.log('IndexedDB available:', indexedDBAvailable);
        console.log('Running as PWA:', isPWA);
        console.log('Online:', navigator.onLine);

        const offlineReady = swRegistered && cacheAvailable && indexedDBAvailable;
        console.log('Offline ready:', offlineReady);

        return {
            swRegistered,
            cacheAvailable,
            indexedDBAvailable,
            isPWA,
            online: navigator.onLine,
            offlineReady
        };
    }

    // Run tests and return results
    return runTests();
})();