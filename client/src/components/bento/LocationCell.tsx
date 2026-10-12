import { Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SITE_LOCATION } from "@/lib/site";

export function LocationCell() {
  return (
    <Card className="flex h-full flex-col justify-center gap-3 p-6">
      <div className="flex items-center gap-2 text-foreground">
        <MapPin size={18} className="text-primary" />
        <span className="text-sm font-semibold">Based in India</span>
      </div>
      <p className="text-sm text-muted">{SITE_LOCATION}</p>
      <div className="flex items-center gap-2 font-mono text-xs text-muted">
        <Clock size={14} className="text-primary" />
        IST (UTC+5:30)
      </div>
    </Card>
  );
}
