"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Award, Briefcase, ExternalLink, FolderGit2, Globe, GraduationCap, Layers, Link2, Loader2, Monitor, Navigation, Save,
  Search, Smartphone, Sparkles, Tablet, Undo2, User, Wrench,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Notice, useNotice } from "@/components/ui/Notice";
import { ApiError, discardHomepageDraft, getHomepageAdmin, isUnauthorized, publishHomepage, saveHomepageDraft } from "@/lib/api-client";
import { refreshHomepageCache } from "@/lib/homepage-actions";
import type { HomepageAdminState, HomepageContent } from "@/lib/homepage";
import { AboutTab } from "./AboutTab";
import { CertificationsTab } from "./CertificationsTab";
import { EducationTab } from "./EducationTab";
import { ExperienceTab } from "./ExperienceTab";
import { normalizeErrors, type FieldErrors } from "./fields";
import { HeroTab } from "./HeroTab";
import { LinksTab } from "./LinksTab";
import { PreviewPane, type PreviewDevice } from "./PreviewPane";
import { ProjectsTab } from "./ProjectsTab";
import { SectionsTab } from "./SectionsTab";
import { SeoTab } from "./SeoTab";
import { SkillsTab } from "./SkillsTab";

type TabId = "hero" | "links" | "about" | "sections" | "seo" | "experience" | "education" | "skills" | "projects" | "certifications";

interface TabDef {
  id: TabId;
  label: string;
  icon: ReactNode;
  /** Whether this tab is part of the draft (saved with Save draft) or saves its own changes straight away. */
  draft: boolean;
}

const TABS: TabDef[] = [
  { id: "hero", label: "Hero & profile", icon: <User className="h-3.5 w-3.5" />, draft: true },
  { id: "links", label: "Links", icon: <Link2 className="h-3.5 w-3.5" />, draft: true },
  { id: "about", label: "About", icon: <Sparkles className="h-3.5 w-3.5" />, draft: true },
  { id: "sections", label: "Sections & navigation", icon: <Navigation className="h-3.5 w-3.5" />, draft: true },
  { id: "seo", label: "Search appearance", icon: <Search className="h-3.5 w-3.5" />, draft: true },
  { id: "experience", label: "Experience", icon: <Briefcase className="h-3.5 w-3.5" />, draft: false },
  { id: "education", label: "Education", icon: <GraduationCap className="h-3.5 w-3.5" />, draft: false },
  { id: "skills", label: "Skills", icon: <Wrench className="h-3.5 w-3.5" />, draft: false },
  { id: "projects", label: "Projects", icon: <FolderGit2 className="h-3.5 w-3.5" />, draft: false },
  { id: "certifications", label: "Certifications", icon: <Award className="h-3.5 w-3.5" />, draft: false },
];

/** Which tab a server validation path (for example "links[1].url") belongs to. */
function tabOfPath(path: string): TabId {
  const key = path.toLowerCase();
  if (key.startsWith("links")) return "links";
  if (key.startsWith("about")) return "about";
  if (key.startsWith("sections") || key.startsWith("contact")) return "sections";
  if (key.startsWith("seo")) return "seo";
  return "hero";
}

const sameContent = (a: HomepageContent | null, b: HomepageContent | null) => JSON.stringify(a) === JSON.stringify(b);

export function AdminHomepageEditor() {
  const router = useRouter();
  const { notice, show, dismiss } = useNotice();

  const [server, setServer] = useState<HomepageAdminState | null>(null);
  const [draft, setDraft] = useState<HomepageContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("hero");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<"save" | "publish" | "discard" | null>(null);
  const [confirm, setConfirm] = useState<"publish" | "discard" | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [listVersion, setListVersion] = useState(0);

  const goToLogin = useCallback(() => router.replace(`/login?from=${encodeURIComponent("/admin/homepage")}`), [router]);

  const load = useCallback(async () => {
    try {
      const state = await getHomepageAdmin();
      setServer(state);
      setDraft(state.draft);
      setLoadError(null);
    } catch (e) {
      if (isUnauthorized(e)) goToLogin();
      else setLoadError(e instanceof Error ? e.message : "Could not load the home page content.");
    }
  }, [goToLogin]);

  useEffect(() => {
    // Deferred so the state updates inside load do not run synchronously in the effect.
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dirty = !!server && !sameContent(draft, server.draft);
  const canPublish = dirty || !!server?.hasUnpublishedChanges;

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleFailure = (e: unknown, fallback: string) => {
    if (isUnauthorized(e)) return goToLogin();
    if (e instanceof ApiError && Object.keys(e.fieldErrors).length > 0) {
      const normalized = normalizeErrors(e.fieldErrors);
      setErrors(normalized);
      const first = Object.keys(normalized)[0];
      if (first) setTab(tabOfPath(first));
      show("error", `Some fields need fixing: ${Object.values(normalized)[0]?.[0] ?? e.message}`);
      return;
    }
    show("error", e instanceof Error ? e.message : fallback);
  };

  const save = async (): Promise<boolean> => {
    if (!draft) return false;
    setBusy("save");
    setErrors({});
    try {
      const state = await saveHomepageDraft(draft);
      setServer(state);
      setDraft(state.draft);
      show("success", "Draft saved. Visitors do not see it until you publish.");
      return true;
    } catch (e) {
      handleFailure(e, "Could not save the draft.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    setConfirm(null);
    if (dirty && !(await save())) return;
    setBusy("publish");
    try {
      const state = await publishHomepage();
      setServer(state);
      setDraft(state.draft);
      // Drop the website's cached copy so visitors get the new page straight away.
      await refreshHomepageCache().catch(() => undefined);
      show("success", "Published. The home page is live with your changes.");
    } catch (e) {
      handleFailure(e, "Could not publish.");
    } finally {
      setBusy(null);
    }
  };

  const discard = async () => {
    setConfirm(null);
    setBusy("discard");
    try {
      const state = await discardHomepageDraft();
      setServer(state);
      setDraft(state.draft);
      setErrors({});
      show("success", "Draft discarded. It now matches the published page.");
    } catch (e) {
      handleFailure(e, "Could not discard the draft.");
    } finally {
      setBusy(null);
    }
  };

  // Counts of problems per tab, from the last failed save.
  const errorCounts = useMemo(() => {
    const counts: Partial<Record<TabId, number>> = {};
    for (const key of Object.keys(errors)) counts[tabOfPath(key)] = (counts[tabOfPath(key)] ?? 0) + 1;
    return counts;
  }, [errors]);

  // After a list changes, drop the website's cached copy of the lists, then reload the preview so it shows them.
  const bumpLists = useCallback(() => {
    void refreshHomepageCache()
      .catch(() => undefined)
      .then(() => setListVersion((v) => v + 1));
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen bg-background px-4 pt-28">
        <div className="mx-auto max-w-xl rounded-2xl border-2 border-accent-coral bg-accent-coral/10 p-6 font-mono text-sm text-accent-coral">
          {loadError}{" "}
          <button type="button" onClick={() => void load()} className="font-bold underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!server || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  const status = dirty ? "Unsaved changes" : server.hasUnpublishedChanges ? "Draft saved, not published" : "Published";
  const statusTone = dirty ? "bg-accent-yellow text-neutral-950" : server.hasUnpublishedChanges ? "bg-accent-sky text-neutral-950" : "bg-accent-mint text-neutral-950";
  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  const tabProps = { content: draft, onChange: setDraft, errors };
  const listProps = { onAuthError: goToLogin, onChanged: bumpLists, onMessage: show };

  return (
    <div className="min-h-screen bg-background px-4 pt-24 pb-10 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-muted hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header and actions */}
        <div className="sticky top-20 z-30 -mx-2 mb-4 flex flex-col gap-3 rounded-2xl border-2 border-line bg-surface/95 p-3 shadow-[3px_3px_0px_var(--shadow-color)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Edit home page</h1>
              <p className="font-mono text-[11px] text-muted">
                {server.draftUpdatedBy ? `Last draft by ${server.draftUpdatedBy}` : "Preview as you type, then publish."}
              </p>
            </div>
            <span className={`rounded-lg border-2 border-line px-2 py-0.5 font-mono text-[11px] font-bold ${statusTone}`}>{status}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="neo-button-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> Open site
            </a>
            <button type="button" onClick={() => setConfirm("discard")} disabled={!canPublish || busy !== null} className="neo-button-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-50">
              {busy === "discard" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />} Discard
            </button>
            <button type="button" onClick={() => void save()} disabled={!dirty || busy !== null} className="neo-button-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-50">
              {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save draft
            </button>
            <button type="button" onClick={() => setConfirm("publish")} disabled={!canPublish || busy !== null} className="neo-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-50">
              {busy === "publish" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />} Publish
            </button>
          </div>
        </div>

        <Notice notice={notice} onDismiss={dismiss} />

        {/* Small screens switch between the editor and the preview */}
        <div className="mt-4 flex gap-2 xl:hidden" role="tablist" aria-label="Editor or preview">
          {(["edit", "preview"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`flex-1 rounded-xl border-2 border-line px-3 py-2 font-mono text-xs font-bold ${view === v ? "bg-primary text-white dark:text-black" : "bg-surface"}`}
            >
              {v === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* Editor */}
          <div className={view === "preview" ? "hidden xl:block" : ""}>
            <div role="tablist" aria-label="Home page sections" className="mb-4 flex flex-wrap gap-1.5">
              {TABS.map((t, index) => (
                <span key={t.id} className="contents">
                  {index === 5 ? <span className="mx-1 hidden w-px self-stretch bg-line sm:block" aria-hidden="true" /> : null}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 py-1.5 font-mono text-[11px] font-bold transition-all ${
                      tab === t.id ? "bg-primary text-white shadow-[2px_2px_0px_var(--shadow-color)] dark:text-black" : "bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                    {errorCounts[t.id] ? <span className="rounded-full bg-accent-coral px-1.5 text-[10px] text-white">{errorCounts[t.id]}</span> : null}
                  </button>
                </span>
              ))}
            </div>

            {!activeTab.draft ? (
              <p className="mb-4 flex items-start gap-2 rounded-xl border-2 border-dashed border-line bg-surface-2/40 p-3 font-mono text-[11px] text-muted">
                <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Items in this tab save as soon as you change them. They are not part of the draft, so Publish does not apply to them.
              </p>
            ) : null}

            {tab === "hero" ? <HeroTab {...tabProps} /> : null}
            {tab === "links" ? <LinksTab {...tabProps} /> : null}
            {tab === "about" ? <AboutTab {...tabProps} /> : null}
            {tab === "sections" ? <SectionsTab {...tabProps} /> : null}
            {tab === "seo" ? <SeoTab {...tabProps} /> : null}
            {tab === "experience" ? <ExperienceTab {...listProps} /> : null}
            {tab === "education" ? <EducationTab {...listProps} /> : null}
            {tab === "skills" ? <SkillsTab {...listProps} /> : null}
            {tab === "projects" ? <ProjectsTab {...listProps} /> : null}
            {tab === "certifications" ? <CertificationsTab {...listProps} /> : null}
          </div>

          {/* Preview */}
          <div className={view === "edit" ? "hidden xl:block" : ""}>
            <div className="xl:sticky xl:top-44">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-xs font-bold text-muted">LIVE PREVIEW (draft, even before saving)</p>
                <div className="flex gap-1" role="group" aria-label="Preview size">
                  {(
                    [
                      ["desktop", <Monitor key="d" className="h-3.5 w-3.5" />, "Desktop"],
                      ["tablet", <Tablet key="t" className="h-3.5 w-3.5" />, "Tablet"],
                      ["mobile", <Smartphone key="m" className="h-3.5 w-3.5" />, "Phone"],
                    ] as const
                  ).map(([id, icon, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={device === id}
                      aria-label={label}
                      title={label}
                      onClick={() => setDevice(id)}
                      className={`rounded-lg border-2 border-line p-1.5 ${device === id ? "bg-primary text-white dark:text-black" : "bg-surface text-muted hover:text-foreground"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[70vh] xl:h-[calc(100vh-14rem)]">
                <PreviewPane content={draft} reloadKey={listVersion} device={device} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "publish"}
        title="Publish the home page?"
        message={dirty ? "Your unsaved changes are saved as the draft first, then the whole draft goes live for every visitor." : "The saved draft goes live for every visitor."}
        confirmLabel="Publish"
        onConfirm={() => void publish()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "discard"}
        title="Discard the draft?"
        message="Everything you changed since the last publish is thrown away and the draft goes back to what visitors see now. This cannot be undone."
        confirmLabel="Discard"
        tone="danger"
        onConfirm={() => void discard()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
