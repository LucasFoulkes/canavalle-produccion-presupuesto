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
      const usuario = await authService.authenticateWithPin(pin);

      if (usuario) {
        navigate({ to: '/app' });
      } else {
        setCodigo(''); // Reset the code if invalid
      }
    } catch (error) {
      setCodigo(''); // Reset the code on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center h-screen gap-3'>
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
