'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
    warning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const noopToast: ToastContextType = {
    showToast: () => { },
    success: () => { },
    error: () => { },
    info: () => { },
    warning: () => { },
}

export function useToast() {
    const context = useContext(ToastContext)
    // Return a no-op fallback during SSR / before the provider tree is ready
    // instead of throwing, which crashes the page on Fast Refresh or hydration.
    return context ?? noopToast
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts(prev => [...prev, { id, message, type }])

        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id))
        }, 5000)
    }, [])

    const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
    const error = useCallback((message: string) => showToast(message, 'error'), [showToast])
    const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
    const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast])

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }

    const getToastStyles = (type: ToastType) => {
        switch (type) {
            case 'success':
                return 'bg-green-500 text-white'
            case 'error':
                return 'bg-red-500 text-white'
            case 'warning':
                return 'bg-yellow-500 text-white'
            case 'info':
            default:
                return 'bg-blue-500 text-white'
        }
    }

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success':
                return '✓'
            case 'error':
                return '✕'
            case 'warning':
                return '⚠'
            case 'info':
            default:
                return 'ℹ'
        }
    }

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
            {children}
            {mounted && createPortal(
                <div className="fixed bottom-4 left-4 z-9999 space-y-2 pointer-events-none">
                    {toasts.map(toast => (
                        <div
                            key={toast.id}
                            className={`${getToastStyles(toast.type)} px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md pointer-events-auto animate-slide-in`}
                        >
                            <span className="text-xl font-bold">{getIcon(toast.type)}</span>
                            <span className="flex-1">{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-white hover:text-gray-200 font-bold text-lg"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}
