import './App.css'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

function App() {
  const maxLength = 6
  return (
    <div className="flex justify-center items-center min-h-screen flex-col gap-4">
      <InputOTP maxLength={maxLength}>
        <InputOTPGroup>
          {Array.from({ length: maxLength }, (_, i) =>
            <InputOTPSlot key={i} index={i} className='size-14 border-zinc-400' />
          )}
        </InputOTPGroup>
      </InputOTP>
      <div className="text-center text-sm">
        Ingresa el código de verificación
      </div>
    </div>
  )
}

export default App
