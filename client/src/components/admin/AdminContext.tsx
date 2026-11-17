"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe, onAuthExpired } from "@/lib/api-client";

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roles?: string[];
  isAdmin: boolean;
}

interface AdminContextType {
  isAdmin: boolean;
  /** Only the owner account manages members. */
  isSuperAdmin: boolean;
  /** The admin who is signed in, or null (also null for a signed-in member who is not an admin). */
  user: AdminUser | null;
  /** Whoever is signed in, admin or member, or null. */
  account: AdminUser | null;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isSuperAdmin: false,
  user: null,
  account: null,
  isLoading: true,
  refreshAuth: async () => {},
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [account, setAccount] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Stores who is signed in: everyone as the account, and admins also as the admin user. */
  const applyMe = useCallback((data: AdminUser | null) => {
    setAccount(data);
    setUser(data && (data.isAdmin || data.role === "Admin" || data.role === "SuperAdmin") ? data : null);
  }, []);

  /** Asks the server who is signed in. If it cannot be reached, what we already know is kept (not "signed out"). */
  const refreshAuth = useCallback(async () => {
    try {
      applyMe(await getMe());
    } catch {
      // A slow or failing server says nothing about the session, so do not change it.
    } finally {
      setIsLoading(false);
    }
  }, [applyMe]);

  useEffect(() => {
    let isMounted = true;
    const check = async (retries: number): Promise<void> => {
      try {
        const data = await getMe();
        if (isMounted) applyMe(data);
      } catch {
        // One more try after a moment before giving up and showing the signed-out view.
        if (retries > 0 && isMounted) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          if (isMounted) await check(retries - 1);
        }
      }
    };
    void check(1).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [applyMe]);

  // The server said "401" to some call: the session is gone, so forget it everywhere at once.
  useEffect(() => onAuthExpired(() => applyMe(null)), [applyMe]);

  const isAdmin = !!user && (user.isAdmin || user.role === "Admin" || user.role === "SuperAdmin");
  const isSuperAdmin = !!user && (user.roles?.includes("SuperAdmin") || user.role === "SuperAdmin");

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isSuperAdmin,
        user,
        account,
        isLoading,
        refreshAuth,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}

/**
 * True once the sign-in state has been checked with the server on this page. The sign-in and sign-up pages wait for
 * it before sending an apparently signed-in visitor on, so a stale "signed in" never bounces them around.
 */
export function useFreshSession(): boolean {
  const { refreshAuth } = useAdmin();
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void refreshAuth().then(() => {
      if (!cancelled) setFresh(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshAuth]);

  return fresh;
}
