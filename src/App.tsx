import './App.css'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

function App() {
  return (
    <div className="flex justify-center items-center min-h-screen flex-col gap-2">
      <InputOTP maxLength={6}>
        <InputOTPGroup >
          {/* <InputOTPGroup className='border-2 border-zinc-200 rounded-lg'> */}
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <div className="text-center text-sm">
        Ingresa el código de verificación
      </div>
    </div>
  )
}

export default App
