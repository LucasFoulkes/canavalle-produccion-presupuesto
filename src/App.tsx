import './App.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useAuth } from '@/contexts/AuthContext'

function App() {
  const maxLength = 6
  const [pinValue, setPinValue] = useState('')
  const { authenticateWithPin, isLoading, error, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleComplete = async (value: string) => {
    if (value.length === maxLength) {
      await authenticateWithPin(value)
    }
  }

  useEffect(() => {
    if (error) {
      setPinValue('')
    }
  }, [error])

  // Navigate to home when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home')
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="flex justify-center items-center min-h-screen flex-col gap-4">
      <InputOTP
        maxLength={maxLength}
        value={pinValue}
        onChange={setPinValue}
        onComplete={handleComplete}
      >
        <InputOTPGroup>
          {Array.from({ length: maxLength }, (_, i) =>
            <InputOTPSlot key={i} index={i} className='size-14 border-zinc-300' />
          )}
        </InputOTPGroup>
      </InputOTP>

      <div className="text-center text-sm">
        {(() => {
          switch (true) {
            case isLoading:
              return <span className="text-blue-600">Verificando...</span>
            case !!error:
              return <span className="text-red-500">{error} trata de nuevo</span>
            default:
              return <span>Ingresa el código de verificación</span>
          }
        })()}
      </div>
    </div>
  )
}

export default App
