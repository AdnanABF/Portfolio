"use client";

import { useCallback, useEffect, useRef } from "react";
import type { HomepageContent } from "@/lib/homepage";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

/**
 * The real home page in a frame, showing the draft as it is typed (before saving). The page inside the frame
 * (/admin/preview) asks for the content when it loads and then receives every change by postMessage. Both sides
 * only accept messages from this same site and this same frame.
 * `reloadKey` reloads the frame, used after the lists (projects, experience, skills) change, since the page reads those itself.
 */
export function PreviewPane({ content, reloadKey, device }: { content: HomepageContent; reloadKey: number; device: PreviewDevice }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const contentRef = useRef(content);

  const send = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: "homepage-preview", content: contentRef.current }, window.location.origin);
  }, []);

  // The page inside the frame says when it is ready to receive.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "homepage-preview-ready") send();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  // Every edit is sent on, a moment after typing pauses.
  useEffect(() => {
    contentRef.current = content;
    const timer = window.setTimeout(send, 150);
    return () => window.clearTimeout(timer);
  }, [content, send]);

  return (
    <div className="flex h-full justify-center overflow-hidden rounded-2xl border-2 border-line bg-surface-2/60">
      <iframe
        key={reloadKey}
        ref={frameRef}
        src="/admin/preview"
        title="Home page preview"
        style={{ width: DEVICE_WIDTH[device] }}
        className="h-full max-w-full border-0 bg-background transition-[width] duration-200"
      />
    </div>
  );
}
