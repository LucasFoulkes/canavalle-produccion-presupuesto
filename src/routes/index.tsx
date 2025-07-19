import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { InputOTP, InputOTPGroup, InputOTPSlot, } from "@/components/ui/input-otp"
import { authService } from '@/services/auth.service'

export const Route = createFileRoute('/')({
  component: Index,
})


function Index() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: 'Ingrese su clave' });

  useEffect(() => {
    (async () => {
      const usuarios = await authService.getStoredUsuarios?.();
      if (usuarios && usuarios.length > 0) {
        navigate({ to: '/app' });
      }
    })();
  }, [navigate]);

  const handlePinChange = useCallback(
    async (value: string) => {
      setPin(value);
      setStatus({ state: 'idle', message: 'Ingrese su clave' });

      if (value.length !== 6) return;

      setStatus({ state: 'loading', message: 'Verificando...' });

      try {
        const user = await authService.authenticateWithPin(value);
        if (user) {
          navigate({ to: '/app' });
        } else {
          setStatus({ state: 'error', message: 'PIN incorrecto' });
          setPin('');
        }
      } catch (err) {
        setStatus({ state: 'error', message: 'Error de autenticación' });
        setPin('');
      }
    },
    [navigate]
  );
  return (
    <div className='h-screen flex flex-col items-center justify-center '>
      <InputOTP
        maxLength={6}
        value={pin}
        onChange={handlePinChange}
      >
        <InputOTPGroup className='shadow-lg rounded-lg backdrop-blur-xl'
          style={{ anchorName: '--input-otp' } as React.CSSProperties} >
          {Array.from({ length: 6 }).map((_, i) => (
            <InputOTPSlot key={i} index={i} className='size-12 text-xl' />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <h1
        className={`fixed p-2 ${status.state === 'error' ? 'text-red-500' : status.state === 'loading' ? 'text-blue-500' : 'text-gray-700'}`}
        style={{
          positionAnchor: '--input-otp',
          insetBlockStart: 'anchor(end)',
        } as React.CSSProperties}
      >
        {status.message}
      </h1>
    </div >
  )
}