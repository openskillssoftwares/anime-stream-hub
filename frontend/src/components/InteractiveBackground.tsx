import { useEffect, useRef } from "react";

/**
 * Subtle interactive starfield + warm-ember orb that follows the cursor.
 * Pure canvas, GPU-friendly, no extra dependencies. Sits behind everything
 * (z-index < content) and respects prefers-reduced-motion.
 */
export const InteractiveBackground = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0, has: false });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let raf = 0;

    const STAR_COUNT = Math.min(140, Math.floor((w * h) / 14000));
    type Star = { x: number; y: number; r: number; vx: number; vy: number; tw: number };
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.2,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      tw: Math.random() * Math.PI * 2,
    }));

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      mouse.current.has = true;
    };
    const onLeave = () => { mouse.current.has = false; };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // ember orb following cursor
      if (mouse.current.has) {
        const grad = ctx.createRadialGradient(
          mouse.current.x, mouse.current.y, 0,
          mouse.current.x, mouse.current.y, 280
        );
        grad.addColorStop(0, "rgba(248, 132, 51, 0.14)");
        grad.addColorStop(0.5, "rgba(217, 70, 130, 0.05)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      for (const s of stars) {
        s.tw += 0.02;
        if (!reduced) {
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < 0) s.x = w; else if (s.x > w) s.x = 0;
          if (s.y < 0) s.y = h; else if (s.y > h) s.y = 0;
        }
        const a = 0.4 + Math.sin(s.tw) * 0.4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 220, ${a.toFixed(3)})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none opacity-70"
      style={{ background: "transparent" }}
    />
  );
};
