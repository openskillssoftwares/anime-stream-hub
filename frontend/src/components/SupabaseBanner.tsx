import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

export default function SupabaseBanner() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/health`);
        if (!res.ok) throw new Error('health check failed');
        const j = await res.json();
        if (mounted) setDown(!j.ok || !j.details?.supabase);
      } catch (err) {
        if (mounted) setDown(true);
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (!down) return null;

  return (
    <div className="w-full bg-amber-600 text-amber-900 px-4 py-2 text-sm flex items-center gap-2">
      <AlertCircle className="w-4 h-4" />
      Comments are currently unavailable — we're reconnecting to the comments service.
    </div>
  );
}
