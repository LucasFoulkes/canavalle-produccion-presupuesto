import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useState, useEffect, useRef } from 'react';
import { authService } from '@/services/usuarios.service';

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [codigo, setCodigo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState<boolean>(() => typeof window !== 'undefined' && localStorage.getItem('syncing') === '1');
  const [syncNote, setSyncNote] = useState<string>(() => (typeof window !== 'undefined' && localStorage.getItem('sync-note')) || '');
  const triedOnce = useRef(false)
  const navigate = useNavigate();

  const handleChange = (value: string) => {
    setCodigo(value);
  };

  // If already logged in (session), go straight to /app
  useEffect(() => {
    (async () => {
      // Preload usuarios if possible (online) so PIN can be checked offline next time
      try {
        await authService.preloadUsuariosIfNeeded()
      } catch { }
      const sessionId = authService.getSessionUserId()
      if (sessionId) {
        navigate({ to: '/app' })
      }
    })()
  }, [navigate])

  // Listen to global sync status
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail || {}
      setIsSyncing(!!detail.syncing)
      setSyncNote(detail.note || '')
    }
    window.addEventListener('sync:status', handler as any)
    return () => window.removeEventListener('sync:status', handler as any)
  }, [])

  useEffect(() => {
    if (isLoading || triedOnce.current) return
    if (codigo.length === 6) {
      triedOnce.current = true
      authenticateUser(codigo);
    }
  }, [codigo, isLoading, navigate]);

  const authenticateUser = async (pin: string) => {
    try {
      setIsLoading(true);
      console.log('=== Authentication Debug ===')
      console.log('PIN entered:', pin)
      console.log('Navigator online:', navigator.onLine)

      setErrorMsg('')
      const usuario = await authService.authenticateWithPin(pin);

      console.log('Authentication result:', usuario)

      if (usuario) {
        console.log('Login successful, navigating to /app')
        navigate({ to: '/app' });
      } else {
        console.log('Login failed, resetting PIN input')
        setErrorMsg('Código incorrecto')
        setCodigo(''); // Reset the code if invalid
        triedOnce.current = false
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setCodigo(''); // Reset the code on error
      setErrorMsg('Error de autenticación')
      triedOnce.current = false
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center h-screen gap-3 relative'>
      <InputOTP
        maxLength={6}
        value={codigo}
        onChange={handleChange}
        disabled={isLoading || isSyncing}
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
      {isSyncing && (
        <div className='flex items-center gap-2 text-sm text-gray-500'>
          <span className='inline-block size-3 rounded-full border-2 border-gray-300 border-t-transparent animate-spin' />
          <span>{syncNote || 'Sincronizando…'}</span>
        </div>
      )}
      {errorMsg && (
        <div className='text-sm text-red-500'>{errorMsg}</div>
      )}
    </div>
  );
}

export default App;
