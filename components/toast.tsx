"use client"

// ============================================================
//  Toast — global notification system
//  Replaces every alert() call in the old codebase
//  Usage:
//    import { useToast } from "@/components/toast"
//    const { toast } = useToast()
//    toast("Investment successful!", "success")
//    toast("Transaction failed", "error")
// ============================================================

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

type ToastType = "success" | "error" | "info" | "warning"

interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = counter++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const iconMap: Record<ToastType, string> = {
    success: "✓",
    error:   "✕",
    info:    "◎",
    warning: "⚠",
  }

  const colorMap: Record<ToastType, string> = {
    success: "rgba(45,212,160,0.3)",
    error:   "rgba(224,82,82,0.3)",
    info:    "rgba(100,149,237,0.3)",
    warning: "rgba(244,165,34,0.3)",
  }

  const textColorMap: Record<ToastType, string> = {
    success: "var(--emerald)",
    error:   "var(--danger)",
    info:    "#6495ED",
    warning: "var(--warning)",
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 9999,
        pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: "var(--bg-elevated)",
              border: `1px solid ${colorMap[t.type]}`,
              borderRadius: 10,
              padding: "13px 20px",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
              animation: "slideUp 0.2s ease",
              maxWidth: 380,
              pointerEvents: "auto",
            }}
          >
            <span style={{ color: textColorMap[t.type], fontSize: 16, flexShrink: 0 }}>
              {iconMap[t.type]}
            </span>
            <span style={{ color: "var(--text-primary)" }}>{t.message}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
