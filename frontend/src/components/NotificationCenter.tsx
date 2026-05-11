import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Info, ShieldAlert, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

  const deleteNotice = async (id: string) => {
    if (!admin) return;
    if (!confirm("Delete this notice?")) return;
    try {
      await api.adminDeleteNotice(id);
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success("Notice deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete notice");
    }
  };

  return (
    <section className="rounded-xl bg-card/60 ring-1 ring-border/60 p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Bell className="w-4 h-4" /> Notification center</h3>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No important notices.</p>}
        {items.map((n) => (
          <div key={n.id} className="rounded-lg bg-secondary/40 px-3 py-2">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                {iconFor(n.level)}
                <p className="text-sm font-medium truncate">{n.title}</p>
              </div>
              {admin && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteNotice(n.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{n.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default NotificationCenter;
