import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const TYPE_STYLES = {
  success: {
    bg: '#0d2218', border: '#1a6338', color: '#4ade80',
    icon: '✓',
  },
  error: {
    bg: '#2a0d0d', border: '#6b1d1d', color: '#f87171',
    icon: '✕',
  },
  info: {
    bg: '#0d1a2a', border: '#1d3d6b', color: '#60a5fa',
    icon: 'ℹ',
  },
  warning: {
    bg: '#2a1e0d', border: '#6b4a1d', color: '#fbbf24',
    icon: '⚠',
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast container — fixed bottom-right, stacked */}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '10px',
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const s = TYPE_STYLES[t.type] || TYPE_STYLES.success
          return (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              style={{
                background: s.bg,
                color: s.color,
                border: `1px solid ${s.border}`,
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                minWidth: '240px',
                maxWidth: '340px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                animation: 'toastSlideIn 0.25s ease',
                cursor: 'pointer',
                pointerEvents: 'all',
                fontFamily: "'Inter','system-ui',sans-serif",
              }}
            >
              <span style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: `${s.border}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '800', flexShrink: 0,
              }}>
                {s.icon}
              </span>
              <span style={{ lineHeight: '1.4' }}>{t.message}</span>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(24px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
