import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { useInstallStatus } from '../hooks/useInstallStatus';

export default function InstallReminder() {
    const { isInstalled, canShowInstallButton, deferredPrompt } = useInstallStatus();
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if user previously dismissed the reminder
        const wasDismissed = localStorage.getItem('install-reminder-dismissed') === 'true';
        setDismissed(wasDismissed);
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('install-reminder-dismissed', 'true');
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    setDismissed(true);
                }
            } catch (error) {
                console.error('Error during installation:', error);
            }
        }
    };

    if (isInstalled || dismissed || !canShowInstallButton) return null;

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                        Instala la app para mejor experiencia
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleInstallClick}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                    >
                        Instalar
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
