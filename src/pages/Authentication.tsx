import { useState } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSupabase } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';

export default function Authentication() {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
    const { verifyAdminPin } = useSupabase();
    const navigate = useNavigate();

    const handlePinComplete = async (value: string) => {
        setPin(value);
        if (value.length === 6) {
            setLoading(true);
            setMessage({ type: 'info', text: 'Verificando PIN...' });

            try {
                const { isValid, userData } = await verifyAdminPin(value);

                if (isValid && userData) {
                    setMessage({ type: 'success', text: `Bienvenido/a ${userData.nombre || 'Administrador/a'}` });
                    // Store user data in session or context if needed
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

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="flex flex-col items-center space-y-6">
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
