import { useState, useRef, useEffect } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useSupabase } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';

export default function Authentication() {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
    const { verifyAdminPin } = useSupabase();
    const navigate = useNavigate();
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    // Focus the hidden input when the component mounts
    useEffect(() => {
        if (hiddenInputRef.current) {
            hiddenInputRef.current.focus();
        }
    }, []);

    const handlePinComplete = async (value: string) => {
        setPin(value);
        if (value.length === 6) {
            setLoading(true);
            setMessage({ type: 'info', text: 'Verificando PIN...' });

            try {
                const { isValid, userData } = await verifyAdminPin(value);

                if (isValid && userData) {
                    setMessage({ type: 'success', text: `Bienvenido/a ${userData.nombre || 'Administrador/a'}` });
                    setTimeout(() => {
                        navigate('/acciones');
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

    // Handle hidden input changes
    const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        // Only take the last 6 digits
        const numericValue = inputValue.replace(/\D/g, '').slice(0, 6);
        setPin(numericValue);
    };

    // Focus the hidden input when clicking on the OTP display
    const handleOTPClick = () => {
        if (hiddenInputRef.current) {
            hiddenInputRef.current.focus();
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="flex flex-col items-center space-y-6">
                {/* Hidden input for mobile keyboard */}
                <input
                    ref={hiddenInputRef}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    value={pin}
                    onChange={handleHiddenInputChange}
                    className="absolute opacity-0 pointer-events-none"
                    aria-hidden="true"
                />

                {/* Visual OTP input */}
                <div onClick={handleOTPClick}>
                    <InputOTP
                        maxLength={6}
                        value={pin}
                        onChange={handlePinComplete}
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
                </div>

                {message && (
                    <div className={`text-sm mt-2 ${message.type === 'error' ? 'text-red-500' :
                        message.type === 'success' ? 'text-green-500' :
                            'text-blue-500'
                        }`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div >
    )
}
