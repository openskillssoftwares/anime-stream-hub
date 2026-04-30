import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";
import { api, type NoticeRow } from "@/lib/api";

type Props = {
  admin?: boolean;
};

const iconFor = (lvl: NoticeRow["level"]) => {
  if (lvl === "critical") return <ShieldAlert className="w-4 h-4 text-destructive" />;
  if (lvl === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (lvl === "success") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  return <Info className="w-4 h-4 text-primary" />;
};

export const NotificationCenter = ({ admin = false }: Props) => {
  const [items, setItems] = useState<NoticeRow[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const data = admin ? await api.adminNotices() : await api.notices();
        setItems(data || []);
      } catch {
        setItems([]);
      }
    };
    run();
  }, [admin]);

  return (
    <section className="rounded-xl bg-card/60 ring-1 ring-border/60 p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Bell className="w-4 h-4" /> Notification center</h3>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No important notices.</p>}
        {items.map((n) => (
          <div key={n.id} className="rounded-lg bg-secondary/40 px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              {iconFor(n.level)}
              <p className="text-sm font-medium">{n.title}</p>
            </div>
            <p className="text-xs text-muted-foreground">{n.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default NotificationCenter;
