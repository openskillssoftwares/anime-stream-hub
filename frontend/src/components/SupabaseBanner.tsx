import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function SupabaseBanner() {
  const [down, setDown] = useState(false);
  const wasDown = useRef(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/health`);
        if (!res.ok) throw new Error('health check failed');
        const j = await res.json();
        const commentsOk = j?.details?.comments;
        if (mounted) setDown(!j.ok || commentsOk === false);
      } catch (err) {
        if (mounted) setDown(true);
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (down && !wasDown.current) {
      toast.warning("Comments service is unavailable right now. Posts may take a moment to appear.", {
        id: "comments-service-unavailable",
        duration: 6000,
      });
    }
    if (!down && wasDown.current) {
      toast.dismiss("comments-service-unavailable");
    }
    wasDown.current = down;
  }, [down]);

  return null;
}
