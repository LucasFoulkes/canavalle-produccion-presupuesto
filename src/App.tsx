import "./App.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/useAuth";

export default function App() {
  const maxLength = 6;
  const [pinValue, setPinValue] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (pinValue.length === maxLength) {
      login(pinValue).then((user) => {
        if (user) navigate("/acciones", { state: { user } });
        else setPinValue("");
      });
    }
  }, [pinValue, login, navigate]);

  return (
    <div className="flex h-full flex-col justify-center items-center ">
      <InputOTP
        maxLength={maxLength}
        value={pinValue}
        onChange={setPinValue}
      >
        <InputOTPGroup className="w-full justify-center ">
          {Array.from({ length: maxLength }, (_, i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="size-14 text-lg bg-white"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <h1 className="p-4 text-lg">Ingrese código</h1>
    </div>
  );
}
