"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { apiLogin } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await apiLogin(email, password);
      router.push("/admin");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please verify and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pt-28 pb-16">
      <div className="w-full max-w-md rounded-2xl border-3 border-line bg-surface p-8 shadow-[8px_8px_0px_var(--shadow-color)]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-muted hover:text-primary mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Portfolio</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-line bg-primary text-white shadow-[2px_2px_0px_var(--shadow-color)]">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-primary">{"// SECURE ACCESS"}</span>
            <h1 className="text-2xl font-extrabold text-foreground">Admin Portal</h1>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border-2 border-accent-coral bg-accent-coral/10 p-3 font-mono text-xs text-accent-coral">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4 font-mono text-xs">
          <div>
            <label className="block font-bold text-foreground mb-1.5">Email / Username</label>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email/username"
              required
              className="w-full rounded-xl border-2 border-line bg-surface-2 p-3 text-sm text-foreground focus:outline-primary placeholder:text-muted"
            />
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1.5">Password</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                required
                className="w-full rounded-xl border-2 border-line bg-surface-2 p-3 pr-11 text-sm text-foreground focus:outline-primary placeholder:text-muted"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 p-1 text-muted hover:text-foreground focus:outline-none transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full mt-4 py-3">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            <span>Authenticate & Enter</span>
          </Button>
        </form>

        <div className="mt-8 border-t border-line/60 pt-4 flex items-center justify-between font-mono text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-secondary" />
            PBKDF2 Salted Auth
          </span>
          <span>ASP.NET Core 10</span>
        </div>
      </div>
    </div>
  );
}
