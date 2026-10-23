import Link from "next/link";
import { Edit3, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { apiLogout } from "@/lib/api-client";

export function AdminBar({
  onToggleEditMode,
  isEditMode,
}: {
  onToggleEditMode: () => void;
  isEditMode: boolean;
}) {
  const handleLogout = async () => {
    await apiLogout();
    window.location.href = "/admin/login";
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-10 items-center justify-between border-b-2 border-line bg-surface/95 px-4 font-mono text-xs shadow-[0px_2px_0px_var(--shadow-color)] backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-bold text-primary">
          <ShieldCheck className="h-4 w-4" />
          <span>ADMIN ACCESS ACTIVE</span>
        </span>

        <button
          onClick={onToggleEditMode}
          className={`flex items-center gap-1.5 rounded-md border-2 border-line px-2.5 py-0.5 font-bold transition-all ${
            isEditMode
              ? "bg-accent-mint text-neutral-950 shadow-[2px_2px_0px_var(--shadow-color)]"
              : "bg-surface-2 text-muted hover:text-foreground"
          }`}
        >
          <Edit3 className="h-3 w-3" />
          <span>Live Card Editing: {isEditMode ? "ON" : "OFF"}</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center gap-1 text-muted hover:text-primary transition-colors font-bold"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Back-Office Dashboard</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-accent-coral hover:underline cursor-pointer"
        >
          <LogOut className="h-3 w-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
