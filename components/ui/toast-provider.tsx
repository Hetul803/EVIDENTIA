"use client";

import * as Toast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState } from "react";

interface ToastContextValue {
  toast: (message: string, variant?: "default" | "error" | "success") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<"default" | "error" | "success">("default");

  const toast = useCallback((msg: string, v: "default" | "error" | "success" = "default") => {
    setMessage(msg);
    setVariant(v);
    setOpen(true);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider>
        {children}
        <Toast.Root
          open={open}
          onOpenChange={setOpen}
          className={`fixed bottom-4 right-4 z-[100] rounded-xl border px-4 py-3 shadow-lg backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in ${
            variant === "error" ? "border-red-500/30 bg-red-500/10 text-red-200" :
            variant === "success" ? "border-green-500/30 bg-green-500/10 text-green-200" :
            "border-white/10 bg-white/5 text-foreground"
          }`}
        >
          <Toast.Description>{message}</Toast.Description>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-[100vh] w-[380px] flex-col gap-2 p-4 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx?.toast ?? (() => {});
}
