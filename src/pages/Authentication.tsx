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
    const { login, isAuthenticated } = useAuth();    // Redirect if already authenticated
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
                setMessage({ type: 'info', text: 'Verificando PIN...' });

                try {
                    const { isValid, userData } = await verifyAdminPin(pin);

                    if (isValid && userData) {
                        setMessage({ type: 'success', text: `Bienvenido/a ${userData.nombre || 'Administrador/a'}` });

                        // Store user data using Auth context
                        login(userData); setTimeout(() => {
                            navigate('/fincas');
                        }, 1000);
                    } else {
                        setMessage({ type: 'error', text: 'PIN inválido. Intente nuevamente.' });
                        setPin('');
                    }
                } catch (error) {
                    console.error('Error during authentication:', error);
                    setMessage({ type: 'error', text: 'Error al verificar el PIN.' });
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
    }; return (
        <div className="flex flex-col items-center justify-between min-h-[90vh] py-8 px-4">            {/* Header */}
            <div className="flex flex-col items-center mb-12 mt-8">
                <h1 className="text-3xl font-bold mb-2">Cananvalle</h1>
                <p className="text-gray-500">Ingrese su PIN para continuar</p>
            </div>

            {/* OTP Input */}
            <div className="flex flex-col items-center">
                <InputOTP
                    maxLength={6}
                    value={pin}
                    onChange={setPin}
                    disabled={loading}
                    containerClassName="gap-4"
                >
                    <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                    </InputOTPGroup>
                </InputOTP>

                {message && (
                    <div className={`text-sm mt-4 ${message.type === 'error' ? 'text-red-500' :
                        message.type === 'success' ? 'text-green-500' :
                            'text-blue-500'
                        }`}>
                        {message.text}
                    </div>
                )}
            </div>            {/* Numeric Keyboard - properly centered */}
            <div className="w-full flex justify-center mt-12 mb-8">
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
