import { useState, useEffect } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useSupabase } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NumericKeyboard from '@/components/NumericKeyboard';

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
    };    return (
        <div className="flex flex-col items-center justify-center h-full bg-background px-6">
            {/* Minimal Header - iPhone style */}
            <div className="flex flex-col items-center text-center mb-16">
                <h1 className="text-4xl font-light text-foreground mb-2 tracking-tight">
                    Cananvalle
                </h1>
                <p className="text-muted-foreground text-sm font-normal">
                    Control de Producción
                </p>
            </div>

            {/* Clean PIN Input */}
            <div className="flex flex-col items-center space-y-8">
                <p className="text-foreground text-lg font-normal">
                    Ingrese su PIN
                </p>                <InputOTP
                    maxLength={6}
                    value={pin}
                    onChange={setPin}
                    disabled={loading}
                    containerClassName="gap-0"
                >
                    <InputOTPGroup className="gap-0">
                        <InputOTPSlot index={0} className="w-14 h-14 text-xl font-normal border border-border/30 rounded-none first:rounded-l-xl focus:border-foreground/60 bg-transparent transition-colors" />
                        <InputOTPSlot index={1} className="w-14 h-14 text-xl font-normal border-t border-b border-r border-border/30 rounded-none focus:border-foreground/60 bg-transparent transition-colors" />
                        <InputOTPSlot index={2} className="w-14 h-14 text-xl font-normal border-t border-b border-r border-border/30 rounded-none focus:border-foreground/60 bg-transparent transition-colors" />
                        <InputOTPSlot index={3} className="w-14 h-14 text-xl font-normal border-t border-b border-r border-border/30 rounded-none focus:border-foreground/60 bg-transparent transition-colors" />
                        <InputOTPSlot index={4} className="w-14 h-14 text-xl font-normal border-t border-b border-r border-border/30 rounded-none focus:border-foreground/60 bg-transparent transition-colors" />
                        <InputOTPSlot index={5} className="w-14 h-14 text-xl font-normal border border-border/30 rounded-none last:rounded-r-xl focus:border-foreground/60 bg-transparent transition-colors" />
                    </InputOTPGroup>
                </InputOTP>

                {message && (
                    <div className={`text-sm text-center px-4 py-2 rounded-lg font-normal ${message.type === 'error'
                        ? 'text-red-600' :
                        message.type === 'success'
                            ? 'text-green-600' :
                            'text-muted-foreground'
                        }`}>
                        {message.text}
                    </div>
                )}
            </div>            {/* Minimal Numeric Keyboard */}
            <div className="mt-16 mb-8">
                <NumericKeyboard
                    onKeyPress={handleKeyPress}
                    onDelete={handleDelete}
                    onClear={handleClear}
                    disabled={loading}
                    minimal={true}
                />
            </div>
        </div>
    );
}
