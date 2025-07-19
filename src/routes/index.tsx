import { createFileRoute } from '@tanstack/react-router'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export const Route = createFileRoute('/')({
  component: Index,
})


function Index() {
  return (
    <div className='h-screen flex items-center justify-center'>
      <InputOTP maxLength={6}>
        <InputOTPGroup className='shadow-lg rounded-lg backdrop-blur-xl '>
          {Array.from({ length: 6 }).map((_, i) => (
            <InputOTPSlot key={i} index={i} className='size-12 text-xl' />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  )
}