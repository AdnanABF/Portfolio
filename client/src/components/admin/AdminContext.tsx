"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe } from "@/lib/api-client";

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

  const refreshAuth = useCallback(async () => {
    try {
      applyMe(await getMe());
    } catch {
      applyMe(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyMe]);
  useEffect(() => {
    let isMounted = true;
    getMe()
      .then((data) => {
        if (isMounted) applyMe(data);
      })
      .catch(() => {
        if (isMounted) applyMe(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [applyMe]);

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
