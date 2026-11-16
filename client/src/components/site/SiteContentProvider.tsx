"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { HomepageContent, HomepageLists } from "@/lib/homepage";

interface SiteContentContextValue {
  /** What to show: the live preview's draft when there is one, otherwise the published content. */
  content: HomepageContent;
  /** The experience, skills and projects the sections show. */
  lists: HomepageLists;
  /** Used only by the admin preview frame to show the draft as it is typed. null goes back to the published content. */
  setPreviewContent: (content: HomepageContent | null) => void;
}

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

/** Gives every part of the page (navigation, hero, sections, footer) the same content, from one place. */
export function SiteContentProvider({ initial, lists, children }: { initial: HomepageContent; lists: HomepageLists; children: ReactNode }) {
  const [preview, setPreview] = useState<HomepageContent | null>(null);
  const setPreviewContent = useCallback((value: HomepageContent | null) => setPreview(value), []);

  const value = useMemo(
    () => ({ content: preview ?? initial, lists, setPreviewContent }),
    [preview, initial, lists, setPreviewContent],
  );

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent(): HomepageContent {
  const ctx = useContext(SiteContentContext);
  if (!ctx) throw new Error("useSiteContent must be used inside SiteContentProvider.");
  return ctx.content;
}

export function useSiteLists(): HomepageLists {
  const ctx = useContext(SiteContentContext);
  if (!ctx) throw new Error("useSiteLists must be used inside SiteContentProvider.");
  return ctx.lists;
}

export function useSetPreviewContent(): (content: HomepageContent | null) => void {
  const ctx = useContext(SiteContentContext);
  if (!ctx) throw new Error("useSetPreviewContent must be used inside SiteContentProvider.");
  return ctx.setPreviewContent;
}
