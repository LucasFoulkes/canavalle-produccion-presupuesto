import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useState, useEffect } from 'react';
import { authService } from '@/services/usuarios.service';

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [codigo, setCodigo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (value: string) => {
    setCodigo(value);
  };

  useEffect(() => {
    if (codigo.length === 6) {
      authenticateUser(codigo);
    }
  }, [codigo, navigate]);

  const authenticateUser = async (pin: string) => {
    try {
      setIsLoading(true);
      console.log('=== Authentication Debug ===')
      console.log('PIN entered:', pin)
      console.log('Navigator online:', navigator.onLine)

      const usuario = await authService.authenticateWithPin(pin);

      console.log('Authentication result:', usuario)

      if (usuario) {
        console.log('Login successful, navigating to /app')
        navigate({ to: '/app' });
      } else {
        console.log('Login failed, resetting PIN input')
        setCodigo(''); // Reset the code if invalid
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setCodigo(''); // Reset the code on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center h-screen gap-3 relative'>
      {/* Version indicator */}
      <div className='absolute top-4 right-4 text-sm text-gray-400 font-mono'>
        v1
      </div>

      <InputOTP
        maxLength={6}
        value={codigo}
        onChange={handleChange}
        disabled={isLoading}
      >
        <InputOTPGroup className='rounded-lg shadow-md'>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <h1 className='text-2xl font-thin'>
        {isLoading ? 'Verificando...' : 'Ingrese su Codigo'}
      </h1>
    </div>
  );
}

export default App;
