"use client";

import { useEffect } from "react";
import { HomePage } from "@/components/site/HomePage";
import { useSetPreviewContent } from "@/components/site/SiteContentProvider";
import { normalizeContent } from "@/lib/homepage";

/**
 * The page the admin editor shows in its preview frame: the real home page, fed the draft by the editor instead of
 * the published content. It only listens to its parent window on this same site.
 */
export function PreviewFrame() {
  const setPreview = useSetPreviewContent();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type === "homepage-preview") setPreview(normalizeContent(event.data.content));
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "homepage-preview-ready" }, window.location.origin);

    return () => {
      window.removeEventListener("message", onMessage);
      setPreview(null);
    };
  }, [setPreview]);

  return <HomePage />;
}
