import { useState } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';

interface InstallDialogProps {
    isOpen: boolean;
    isIOS: boolean;
    canShowInstallButton: boolean;
    deferredPrompt: any;
    onInstall: () => void;
    onClose: () => void;
}

export default function InstallDialog({
    isOpen,
    isIOS,
    canShowInstallButton,
    deferredPrompt,
    onInstall,
    onClose
}: InstallDialogProps) {
    const [installing, setInstalling] = useState(false);

    if (!isOpen) return null;

    const handleInstallClick = async () => {
        if (deferredPrompt && !installing) {
            setInstalling(true);
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    onInstall();
                }
            } catch (error) {
                console.error('Error during installation:', error);
            } finally {
                setInstalling(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6 mx-4">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-5xl mb-3">📱</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Instalar Aplicación
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Instala <strong>Cananvalle</strong> para una mejor experiencia
                    </p>
                </div>

                {/* Android/Chrome - Show install button */}
                {canShowInstallButton && (
                    <div className="space-y-4">
                        <button
                            onClick={handleInstallClick}
                            disabled={installing}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            {installing ? 'Instalando...' : 'Instalar Aplicación'}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Continuar en navegador
                        </button>
                    </div>
                )}

                {/* iOS - Show manual instructions */}
                {isIOS && (
                    <div className="space-y-4">
                        <div className="text-left text-sm text-gray-700 dark:text-gray-300 space-y-3">
                            <p className="font-medium text-gray-900 dark:text-white">Para instalar en iOS:</p>

                            <div className="space-y-2">
                                <div className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                    <span>Toca el botón <Share className="inline w-4 h-4 mx-1" /> en Safari</span>
                                </div>

                                <div className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                    <span>Selecciona <Plus className="inline w-4 h-4 mx-1" /> "Añadir a inicio"</span>
                                </div>

                                <div className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                    <span>Toca "Añadir"</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                )}

                {/* Other browsers - Generic instructions */}
                {!canShowInstallButton && !isIOS && (
                    <div className="space-y-4">
                        <div className="text-left text-sm text-gray-700 dark:text-gray-300 space-y-2">
                            <p className="font-medium text-gray-900 dark:text-white">Para instalar:</p>
                            <ul className="space-y-1 ml-4">
                                <li>• Busca la opción "Instalar aplicación" en el menú de tu navegador</li>
                                <li>• O añade esta página a marcadores para acceso rápido</li>
                            </ul>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
