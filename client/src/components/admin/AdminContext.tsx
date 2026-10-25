"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { InContextEditDrawer } from "./InContextEditDrawer";
import { getMe } from "@/lib/api-client";

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roles?: string[];
  isAdmin: boolean;
}

interface DrawerState {
  isOpen: boolean;
  type: "project" | "experience" | "setting" | "skill";
  initialData: Record<string, unknown> | null;
  drawerId?: string;
  onSaved?: (data: Record<string, unknown>) => void;
}

interface AdminContextType {
  isAdmin: boolean;
  user: AdminUser | null;
  isLoading: boolean;
  isEditMode: boolean;
  refreshAuth: () => Promise<void>;
  toggleEditMode: () => void;
  openEditor: (
    type: "project" | "experience" | "setting" | "skill",
    initialData: Record<string, unknown>,
    onSaved?: (data: Record<string, unknown>) => void
  ) => void;
  closeEditor: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  user: null,
  isLoading: true,
  isEditMode: false,
  refreshAuth: async () => {},
  toggleEditMode: () => {},
  openEditor: () => {},
  closeEditor: () => {},
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({
    isOpen: false,
    type: "setting",
    initialData: null,
  });

  const refreshAuth = useCallback(async () => {
    try {
      const data = await getMe();
      if (data && (data.isAdmin || data.role === "Admin" || data.role === "SuperAdmin")) {
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    let isMounted = true;
    getMe()
      .then((data) => {
        if (!isMounted) return;
        if (data && (data.isAdmin || data.role === "Admin" || data.role === "SuperAdmin")) {
          setUser(data);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isAdmin = !!user && (user.isAdmin || user.role === "Admin" || user.role === "SuperAdmin");

  const toggleEditMode = () => {
    setIsEditMode((prev) => !prev);
  };

  const openEditor = (
    type: "project" | "experience" | "setting" | "skill",
    initialData: Record<string, unknown>,
    onSaved?: (data: Record<string, unknown>) => void
  ) => {
    const rawId = initialData.id ?? initialData.key ?? initialData.name ?? Date.now();
    setDrawer({
      isOpen: true,
      type,
      initialData,
      onSaved,
      drawerId: String(rawId),
    });
  };

  const closeEditor = () => {
    setDrawer((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        user,
        isLoading,
        isEditMode,
        refreshAuth,
        toggleEditMode,
        openEditor,
        closeEditor,
      }}
    >
      {children}
      {drawer.isOpen && drawer.initialData && (
        <InContextEditDrawer
          key={`${drawer.type}-${drawer.drawerId}`}
          isOpen={drawer.isOpen}
          type={drawer.type}
          initialData={drawer.initialData}
          onClose={closeEditor}
          onSaved={(data) => {
            if (drawer.onSaved) drawer.onSaved(data);
          }}
        />
      )}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
