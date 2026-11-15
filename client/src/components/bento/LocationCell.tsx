"use client";

import { Clock, MapPin } from "lucide-react";
import { useSiteContent } from "@/components/site/SiteContentProvider";
import { Card } from "@/components/ui/Card";

export function LocationCell() {
  const { location } = useSiteContent();
  if (!location.title && !location.address && !location.timeZone) return null;

  return (
    <Card className="flex h-full flex-col justify-center gap-3 p-6">
      {location.title ? (
        <div className="flex items-center gap-2 text-foreground">
          <MapPin size={18} className="text-primary" />
          <span className="text-sm font-semibold">{location.title}</span>
        </div>
      ) : null}
      {location.address ? <p className="text-sm text-muted">{location.address}</p> : null}
      {location.timeZone ? (
        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          <Clock size={14} className="text-primary" />
          {location.timeZone}
        </div>
      ) : null}
    </Card>
  );
}
