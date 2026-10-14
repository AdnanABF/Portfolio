"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { AdminBar } from "./AdminBar";
import { InContextEditDrawer } from "./InContextEditDrawer";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return localStorage.getItem("abf_admin_token");
}

function getServerSnapshot() {
  return null;
}

interface DrawerState {
  isOpen: boolean;
  type: "project" | "experience" | "setting";
  initialData: Record<string, unknown> | null;
  onSaved?: (data: Record<string, unknown>) => void;
}

interface AdminContextType {
  isAdmin: boolean;
  isEditMode: boolean;
  toggleEditMode: () => void;
  openEditor: (
    type: "project" | "experience" | "setting",
    initialData: Record<string, unknown>,
    onSaved?: (data: Record<string, unknown>) => void
  ) => void;
  closeEditor: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isEditMode: false,
  toggleEditMode: () => {},
  openEditor: () => {},
  closeEditor: () => {},
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isAdmin = !!token;
  const [isEditMode, setIsEditMode] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({
    isOpen: false,
    type: "setting",
    initialData: null,
  });

  const toggleEditMode = () => {
    setIsEditMode((prev) => !prev);
  };

  const openEditor = (
    type: "project" | "experience" | "setting",
    initialData: Record<string, unknown>,
    onSaved?: (data: Record<string, unknown>) => void
  ) => {
    setDrawer({
      isOpen: true,
      type,
      initialData,
      onSaved,
    });
  };

  const closeEditor = () => {
    setDrawer((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isEditMode,
        toggleEditMode,
        openEditor,
        closeEditor,
      }}
    >
      {isAdmin && (
        <AdminBar
          isEditMode={isEditMode}
          onToggleEditMode={toggleEditMode}
        />
      )}
      {children}
      {drawer.isOpen && drawer.initialData && (
        <InContextEditDrawer
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
