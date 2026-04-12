"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast stack — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-3 px-4 py-3 rounded shadow-lg text-sm max-w-sm pointer-events-auto ${
                toast.type === "success"
                  ? "bg-green-900 border border-green-700 text-green-100"
                  : toast.type === "error"
                  ? "bg-red-950 border border-red-800 text-red-100"
                  : "bg-secondary border border-border text-foreground/80"
              }`}
            >
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-current opacity-50 hover:opacity-100 leading-none mt-0.5"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
