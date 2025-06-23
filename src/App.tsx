// App.tsx
import "./App.css";
import { useState } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function App() {
  const maxLength = 6;
  const [pinValue, setPinValue] = useState("");

  return (
    <div className="flex h-full flex-col justify-between items-stretch">
      <h1 className="p-4 text-2xl">Ingrese código</h1>

      <InputOTP
        maxLength={maxLength}
        value={pinValue}
        onChange={setPinValue}
      >
        <InputOTPGroup
          className="w-full justify-center ">
          {Array.from({ length: maxLength }, (_, i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="size-14 text-lg bg-white"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <span></span>
    </div >
  );
}
