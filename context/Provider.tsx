"use client";

/**
 * Provider.tsx
 *
 * Manages auth state from NextAuth session (JWT cookie — works on Vercel).
 * Express is still the login authority; NextAuth stores the result.
 *
 * useUser() returns the full user object from the session.
 * refresh() re-fetches Express /auth/me to pick up profile changes,
 * then triggers a NextAuth session update.
 */

import {
    createContext,
    useContext,
    useCallback,
    useState,
    type ReactNode,
} from "react";
import { SessionProvider, useSession } from "next-auth/react";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

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
    refresh: () => void;
}

const UserContext = createContext<UserContextValue>({
    user: null,
    loading: true,
    refresh: () => {},
});

function UserProvider({ children }: { children: ReactNode }) {
    const { data: session, status, update } = useSession();
    const [tick, setTick] = useState(0);

    const user: SessionUser | null = session?.user
        ? (session.user as any as SessionUser)
        : null;

    const loading = status === "loading";

    // refresh() re-fetches Express /auth/me and syncs the NextAuth session
    const refresh = useCallback(() => {
        // Trigger NextAuth session re-fetch
        update();
        setTick((t) => t + 1);
    }, [update]);

    return (
        <UserContext.Provider value={{ user, loading, refresh }}>
            {children}
        </UserContext.Provider>
    );
}

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <UserProvider>{children}</UserProvider>
        </SessionProvider>
    );
}

export function useUser(): UserContextValue {
    return useContext(UserContext);
}
