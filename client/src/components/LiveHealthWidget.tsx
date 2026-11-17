"use client";

import { useEffect, useState } from "react";
import { Activity, Cpu, Database, Server, X } from "lucide-react";
import { getHealth } from "@/lib/api-client";

interface HealthData {
  status: string;
  dbLatencyMs: number;
  uptimeSeconds: number;
  framework?: string;
  database?: string;
}

export function LiveHealthWidget() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      const data = await getHealth();
      if (data) setHealth(data);
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 20000); // 20s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Floating Pill Trigger (Bottom Right) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border-2 border-line bg-surface/90 px-3.5 py-1.5 font-mono text-xs font-bold text-foreground shadow-[3px_3px_0px_var(--shadow-color)] backdrop-blur-md transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_var(--shadow-color)] cursor-pointer"
        title="View live system architecture & API latency"
      >
        <span className="relative flex h-2 w-2">
          {health && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-mint opacity-75"></span>
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              health ? "bg-accent-mint" : "bg-muted"
            }`}
          ></span>
        </span>
        <span>
          .NET API:{" "}
          <strong
            className={`font-bold ${
              health ? "text-secondary" : "text-muted"
            }`}
          >
            {health ? `${health.dbLatencyMs}ms` : "Offline"}
          </strong>
        </span>
      </button>

      {/* Slide-out Architecture & Telemetry Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 p-4">
          <div className="relative w-full max-w-lg rounded-2xl border-3 border-line bg-surface p-6 shadow-[6px_6px_0px_var(--shadow-color)]">
            <div className="flex items-center justify-between border-b-2 border-line pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-secondary" />
                <h3 className="font-bold text-lg text-foreground">
                  Live System Architecture & Health
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-cream hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="rounded-xl border-2 border-line bg-surface-2 p-3 shadow-[2px_2px_0px_var(--shadow-color)]">
                <div className="text-muted">PostgreSQL Latency</div>
                <div
                  className={`mt-1 text-xl font-bold ${
                    health ? "text-secondary" : "text-muted"
                  }`}
                >
                  {health ? `${health.dbLatencyMs} ms` : "Offline"}
                </div>
              </div>

              <div className="rounded-xl border-2 border-line bg-surface-2 p-3 shadow-[2px_2px_0px_var(--shadow-color)]">
                <div className="text-muted">Backend Service</div>
                <div className="mt-1 text-base font-bold text-primary">
                  ASP.NET Core 10
                </div>
              </div>
            </div>

            {/* Architecture Pipeline Visualizer */}
            <div className="mt-5 rounded-xl border-2 border-line bg-surface-2 p-4">
              <div className="text-xs font-mono font-bold text-muted mb-3">
                DATA FLOW & CLOUD TOPOLOGY
              </div>
              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between rounded-lg border border-line bg-surface p-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    <span>Next.js 16 (App Router)</span>
                  </div>
                  <span className="rounded bg-accent-mint/20 text-accent-mint px-2 py-0.5 text-[10px] font-bold">
                    SSR + ISR
                  </span>
                </div>

                <div className="flex justify-center text-muted">↓ REST API / HTTPS</div>

                <div className="flex items-center justify-between rounded-lg border border-line bg-surface p-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-accent-coral" />
                    <span>ASP.NET Core 10 (Linux ARM64)</span>
                  </div>
                  <span className="rounded bg-accent-mint/20 text-accent-mint px-2 py-0.5 text-[10px] font-bold">
                    ~40MB RAM
                  </span>
                </div>

                <div className="flex justify-center text-muted">↓ Npgsql EF Core</div>

                <div className="flex items-center justify-between rounded-lg border border-line bg-surface p-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-accent-sky" />
                    <span>PostgreSQL in Coolify</span>
                  </div>
                  <span className="rounded bg-accent-mint/20 text-accent-mint px-2 py-0.5 text-[10px] font-bold">
                    ACID
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center font-mono text-[10px] text-muted">
              Hosted on private VPS via Coolify • Automated Tailscale CI/CD Pipelines
            </div>
          </div>
        </div>
      )}
    </>
  );
}
