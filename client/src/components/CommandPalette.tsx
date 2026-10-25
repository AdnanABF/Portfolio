"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSettings, trackCvDownload } from "@/lib/api-client";
import {
  Briefcase,
  Code2,
  FileDown,
  FolderGit2,
  Lock,
  Moon,
  Search,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react";

interface ActionItem {
  id: string;
  title: string;
  category: "Navigation" | "Actions" | "Admin";
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [cvUrl, setCvUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    getSettings().then((settings) => {
      if (!isMounted) return;
      if (settings.hero_photo_cv) {
        try {
          const parsed = JSON.parse(settings.hero_photo_cv);
          if (parsed.cvUrl) setCvUrl(parsed.cvUrl);
        } catch {
          // ignore
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const actions: ActionItem[] = [
    {
      id: "nav-about",
      title: "About Me",
      category: "Navigation",
      icon: User,
      action: () => {
        router.push("/#about");
        setIsOpen(false);
      },
    },
    {
      id: "nav-projects",
      title: "Featured Projects",
      category: "Navigation",
      icon: FolderGit2,
      action: () => {
        router.push("/projects");
        setIsOpen(false);
      },
    },
    {
      id: "nav-experience",
      title: "Work Experience & Career",
      category: "Navigation",
      icon: Briefcase,
      action: () => {
        router.push("/#experience");
        setIsOpen(false);
      },
    },
    {
      id: "nav-skills",
      title: "Skills & Tech Stack",
      category: "Navigation",
      icon: Code2,
      action: () => {
        router.push("/#skills");
        setIsOpen(false);
      },
    },
    {
      id: "nav-resume",
      title: "Interactive Web Resume (/resume)",
      category: "Navigation",
      icon: Sparkles,
      action: () => {
        router.push("/resume");
        setIsOpen(false);
      },
    },
    {
      id: "action-theme",
      title: `Toggle Theme (Current: ${theme})`,
      category: "Actions",
      icon: theme === "dark" ? Sun : Moon,
      action: () => {
        setTheme(theme === "dark" ? "light" : "dark");
        setIsOpen(false);
      },
    },
    ...(cvUrl
      ? [
          {
            id: "action-cv",
            title: "Download CV (PDF)",
            category: "Actions" as const,
            icon: FileDown,
            action: () => {
              trackCvDownload("command_palette");
              window.open(cvUrl, "_blank");
              setIsOpen(false);
            },
          },
        ]
      : []),
    {
      id: "admin-login",
      title: "Admin CMS Portal (/admin)",
      category: "Admin",
      icon: Lock,
      action: () => {
        router.push("/admin");
        setIsOpen(false);
      },
    },
  ];

  const filtered = actions.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl border-3 border-line bg-surface p-4 shadow-[6px_6px_0px_var(--shadow-color)]">
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b-2 border-line pb-3">
          <Search className="mr-3 h-5 w-5 text-muted shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search (e.g. projects, theme, admin)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent font-mono text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="ml-2 rounded-lg p-1 text-muted hover:bg-cream hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="mt-3 max-h-80 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center font-mono text-xs text-muted">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="flex w-full items-center justify-between rounded-xl border border-transparent p-2.5 text-left text-sm transition-all hover:border-line hover:bg-cream hover:shadow-[2px_2px_0px_var(--shadow-color)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{item.title}</div>
                      <div className="font-mono text-[10px] text-muted">{item.category}</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted">↵</span>
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard Footer Tip */}
        <div className="mt-3 flex items-center justify-between border-t border-line/50 pt-2 font-mono text-[10px] text-muted">
          <span>Navigate with click or arrow keys</span>
          <span className="rounded bg-cream px-1.5 py-0.5 border border-line">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
