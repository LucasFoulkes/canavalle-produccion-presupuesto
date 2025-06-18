import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export default function PWAUpdateNotification() {
    const { needRefresh, updateAvailable, updateApp, dismissUpdate, forceUpdate } = usePWAUpdate();
    const [showNotification, setShowNotification] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (updateAvailable) {
            setShowNotification(true);
        }
    }, [updateAvailable]);

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            await updateApp();
        } catch (error) {
            console.error('Update failed:', error);
            setIsUpdating(false);
        }
    };

    const handleForceUpdate = async () => {
        setIsUpdating(true);
        try {
            await forceUpdate();
        } catch (error) {
            console.error('Force update failed:', error);
            setIsUpdating(false);
        }
    };

    const handleDismiss = () => {
        setShowNotification(false);
        dismissUpdate();
    };

    if (!showNotification || !needRefresh) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-primary text-white shadow-lg animate-fade-in">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Download className="h-5 w-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                                Nueva versión disponible
                            </p>
                            <p className="text-xs opacity-90">
                                Actualiza para obtener las últimas funciones
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30"
                        >
                            {isUpdating ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Actualizando...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Actualizar
                                </>
                            )}
                        </Button>

                        {/* Advanced options toggle */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            disabled={isUpdating}
                            className="hover:bg-white/10 text-white"
                            title="Opciones avanzadas"
                        >
                            <AlertTriangle className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            disabled={isUpdating}
                            className="hover:bg-white/10 text-white"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Advanced options */}
                {showAdvanced && (
                    <div className="mt-3 pt-3 border-t border-white/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs opacity-75">
                                ¿La actualización no funciona? Prueba la actualización forzada:
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleForceUpdate}
                                disabled={isUpdating}
                                className="bg-orange-500/20 hover:bg-orange-500/30 text-white border-orange-300/30"
                            >
                                {isUpdating ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Forzando...
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-4 w-4 mr-2" />
                                        Forzar Actualización
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
