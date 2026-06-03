"use client";

/**
 * Provider.tsx
 *
 * Wraps the app with NextAuth's SessionProvider and exposes a thin
 * useUser() hook that returns the full DB user record.
 *
 * SessionProvider  → manages the NextAuth JWT session cookie
 * UserProvider     → fetches /api/user/me and caches the full DB record
 *
 * app/layout.tsx renders <Providers> which composes both.
 */

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { SessionProvider, useSession } from "next-auth/react";

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
    /** Re-fetch /api/user/me — call after profile updates */
    refresh: () => void;
}

const UserContext = createContext<UserContextValue>({
    user: null,
    loading: true,
    refresh: () => { },
});

// ─── Inner provider — must be inside SessionProvider ─────────────────────────
function UserProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [user, setUser] = useState<SessionUser | null>(null);
    // Start true — stays true until the full session + /api/user/me cycle completes.
    // This prevents the brief window where loading=false and user=null triggers a redirect.
    const [userLoading, setUserLoading] = useState(true);
    const [tick, setTick] = useState(0);

    const sessionLoading = status === "loading";

    useEffect(() => {
        // Still waiting for NextAuth to resolve — do nothing yet
        if (sessionLoading) return;

        if (!session) {
            // Confirmed unauthenticated
            setUser(null);
            setUserLoading(false);
            return;
        }

        // Authenticated — fetch full DB record
        setUserLoading(true);
        fetch("/api/user/me", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setUser(data?.user ?? null))
            .catch(() => setUser(null))
            .finally(() => setUserLoading(false));
    }, [session, sessionLoading, tick]);

    const refresh = () => setTick((t) => t + 1);

    // loading stays true until BOTH the session AND the /api/user/me fetch are done
    const loading = sessionLoading || userLoading;

    return (
        <UserContext.Provider value={{ user, loading, refresh }}>
            {children}
        </UserContext.Provider>
    );
}

// ─── Root provider — exported and used in app/layout.tsx ─────────────────────
export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
            <UserProvider>{children}</UserProvider>
        </SessionProvider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useUser(): UserContextValue {
    return useContext(UserContext);
}
