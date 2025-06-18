import { useState, useEffect } from 'react';

interface InstallStatus {
    isInstalled: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    canShowInstallButton: boolean;
    deferredPrompt: any;
}

export const useInstallStatus = (): InstallStatus => {
    const [status, setStatus] = useState<InstallStatus>({
        isInstalled: false,
        isIOS: false,
        isAndroid: false,
        canShowInstallButton: false,
        deferredPrompt: null
    });

    useEffect(() => {
        const checkStatus = () => {
            // Check if installed (standalone mode)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isIOSStandalone = (window.navigator as any).standalone === true;
            const isInstalled = isStandalone || isIOSStandalone;

            // Platform detection
            const userAgent = navigator.userAgent;
            const isIOS = /iPad|iPhone|iPod/.test(userAgent);
            const isAndroid = /Android/.test(userAgent);

            setStatus(prev => ({
                ...prev,
                isInstalled,
                isIOS,
                isAndroid,
                canShowInstallButton: !isInstalled && !isIOS // Android/Chrome can show install button
            }));
        };

        checkStatus();

        // Listen for beforeinstallprompt (Android/Chrome only)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setStatus(prev => ({
                ...prev,
                deferredPrompt: e,
                canShowInstallButton: true
            }));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for appinstalled event
        const handleAppInstalled = () => {
            setStatus(prev => ({
                ...prev,
                isInstalled: true,
                deferredPrompt: null,
                canShowInstallButton: false
            }));
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    return status;
};
