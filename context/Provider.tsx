"use client";

/**
 * Provider.tsx
 *
 * Manages auth state by polling Express /auth/me directly.
 * The Express server sets an HttpOnly auth_token cookie on login;
 * every request to /auth/me is validated against it.
 *
 * No NextAuth — session is owned entirely by Express.
 */

import {
    createContext,
    useContext,
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from "react";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

// ─── Full DB user shape exposed to the app ────────────────────────────────────
export interface SessionUser {
    _id: string;
    name: string;
    slug: string;
    email: string;
    phone?: string;
    type: "admin" | "reporter" | "editor" | "user" | "seller";
    image?: string;
    status: "active" | "inactive" | "suspended";
    address?: string;
    state?: string;
    city?: string;
    zipCode?: string;
}

interface UserContextValue {
    user: SessionUser | null;
    loading: boolean;
    /** Re-fetch user — call after login, logout, or profile updates */
    refresh: () => void;
}

const UserContext = createContext<UserContextValue>({
    user: null,
    loading: true,
    refresh: () => { },
});

// ─── Provider ─────────────────────────────────────────────────────────────────
function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);

    const fetchUser = useCallback(() => {
        setLoading(true);
        fetch(`${EXPRESS_API}/auth/me`, {
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "x-license-key": LICENSE_KEY,
            },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setUser((data?.user as SessionUser) ?? null))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser, tick]);

    const refresh = () => setTick((t) => t + 1);

    return (
        <UserContext.Provider value={{ user, loading, refresh }}>
            {children}
        </UserContext.Provider>
    );
}

// ─── Root provider ─────────────────────────────────────────────────────────────
export function Providers({ children }: { children: ReactNode }) {
    return <UserProvider>{children}</UserProvider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useUser(): UserContextValue {
    return useContext(UserContext);
}
