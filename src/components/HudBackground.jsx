import { useEffect, useRef } from 'react';

/**
 * 2040 Sci-Fi HUD Background:
 * - Faint star/particle canvas (pauses if `prefers-reduced-motion` is set)
 * - Perspective grid floor, subtle CRT scanlines, and vignette (CSS)
 */
export default function HudBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let animId = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 65 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.4,
      vy: Math.random() * 0.25 + 0.08,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 235, 255, ${s.alpha})`;
        ctx.fill();
        if (!reducedMotion) {
          s.y -= s.vy;
          if (s.y < -4) {
            s.y = canvas.height + 4;
            s.x = Math.random() * canvas.width;
          }
        }
      }
      if (!reducedMotion) {
        animId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="hud-bg" aria-hidden="true">
      <canvas ref={canvasRef} className="hud-canvas" />
      <div className="hud-grid-floor" />
      <div className="hud-scanlines" />
      <div className="hud-vignette" />
    </div>
  );
}
