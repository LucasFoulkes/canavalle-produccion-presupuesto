import { useState, useEffect } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useSupabase } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NumericKeyboard from '@/components/NumericKeyboard';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function Authentication() {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
    const { verifyAdminPin } = useSupabase();
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/fincas');
        }
    }, [isAuthenticated, navigate]);

    // Check PIN when it's complete
    useEffect(() => {
        const verifyPin = async () => {
            if (pin.length === 6 && !loading) {
                setLoading(true);
                setMessage({ type: 'info', text: 'Verificando acceso...' });

                try {
                    const { isValid, userData } = await verifyAdminPin(pin);

                    if (isValid && userData) {
                        setMessage({ type: 'success', text: `Bienvenido/a ${userData.nombre || 'Administrador/a'}` });

                        // Store user data using Auth context
                        login(userData);

                        setTimeout(() => {
                            navigate('/fincas');
                        }, 1000);
                    } else {
                        setMessage({ type: 'error', text: 'PIN incorrecto. Intente nuevamente.' });
                        setPin('');
                    }
                } catch (error) {
                    console.error('Error during authentication:', error);
                    setMessage({ type: 'error', text: 'Error de conexión. Intente nuevamente.' });
                } finally {
                    setLoading(false);
                }
            }
        };

        verifyPin();
    }, [pin, loading, verifyAdminPin, login, navigate]);

    // Handle keyboard input
    const handleKeyPress = (key: string) => {
        if (pin.length < 6 && !loading) {
            setPin(prev => prev + key);
        }
    };

    // Handle backspace
    const handleDelete = () => {
        if (pin.length > 0 && !loading) {
            setPin(prev => prev.slice(0, -1));
        }
    };

    // Handle clear
    const handleClear = () => {
        if (!loading) {
            setPin('');
            setMessage(null);
        }
    }; return (<div className="flex flex-col items-center justify-between h-full py-8 px-4">
        {/* Professional Header */}
        <div className="flex flex-col items-center mb-12 mt-8 text-center">
            <div className="mb-6 p-4 rounded-2xl glass-professional shadow-professional-lg">
                <Shield className="w-12 h-12 text-professional-primary" />
            </div>                <h1 className="text-3xl font-bold mb-3 text-professional-primary bauhaus-title">
                Cananvalle
            </h1>
            <p className="text-professional-muted text-base font-medium bauhaus-header">
                Control de Producción
            </p>
        </div>

        {/* PIN Input */}
        <div className="flex flex-col items-center">
            <div className="glass-professional rounded-xl p-8 shadow-professional-xl">
                <div className="mb-4 text-center">
                    <p className="text-sm text-professional-muted font-medium mb-4">
                        Ingrese su PIN de acceso
                    </p>
                </div>

                <InputOTP
                    maxLength={6}
                    value={pin}
                    onChange={setPin}
                    disabled={loading}
                    containerClassName="gap-2"
                >
                    <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="w-12 h-12 text-lg font-medium border-2 border-border rounded-lg focus:border-primary/40 bg-background" />
                        <InputOTPSlot index={1} className="w-12 h-12 text-lg font-medium border-2 border-border rounded-lg focus:border-primary/40 bg-background" />
                        <InputOTPSlot index={2} className="w-12 h-12 text-lg font-medium border-2 border-border rounded-lg focus:border-primary/40 bg-background" />
                        <InputOTPSlot index={3} className="w-12 h-12 text-lg font-medium border-2 border-border rounded-lg focus:border-primary/40 bg-background" />
                        <InputOTPSlot index={4} className="w-12 h-12 text-lg font-medium border-2 border-border rounded-lg focus:border-primary/40 bg-background" />
                        <InputOTPSlot index={5} className="w-12 h-12 text-lg font-medium border-2 border-border rounded-lg focus:border-primary/40 bg-background" />
                    </InputOTPGroup>
                </InputOTP>

                {message && (
                    <div className={`text-sm mt-4 text-center p-3 rounded-lg font-medium flex items-center justify-center gap-2 ${message.type === 'error'
                        ? 'text-destructive bg-destructive/10 border border-destructive/20' :
                        message.type === 'success'
                            ? 'text-professional-primary bg-professional-primary/10 border border-professional-primary/20' :
                            'text-professional-muted bg-muted border border-border'
                        }`}>
                        {message.type === 'error' && <AlertCircle className="w-4 h-4" />}
                        {message.type === 'success' && <CheckCircle className="w-4 h-4" />}
                        {message.type === 'info' && <Loader2 className="w-4 h-4 animate-spin" />}
                        {message.text}
                    </div>
                )}
            </div>
        </div>            {/* Numeric Keyboard */}
        <div className="w-full flex justify-center mt-8 mb-8">
            <NumericKeyboard
                onKeyPress={handleKeyPress}
                onDelete={handleDelete}
                onClear={handleClear}
                disabled={loading}
            />
        </div>
    </div>
    );
}
