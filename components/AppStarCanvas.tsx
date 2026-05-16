"use client";
import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  phase: number;      // twinkle phase offset
  phaseSpeed: number; // twinkle speed
  drift: number;      // upward drift speed px/frame
}

export function AppStarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cv: HTMLCanvasElement = canvas;
    const ctx2d = cv.getContext("2d");
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;

    let animId: number;
    let stars: Star[] = [];
    let frame = 0;

    function resize() {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    }

    function buildStars() {
      stars = Array.from({ length: 70 }, () => ({
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        r: 0.5 + Math.random() * 1.1,
        baseOpacity: 0.12 + Math.random() * 0.38,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.004 + Math.random() * 0.008,  // very slow twinkle
        drift: 0.04 + Math.random() * 0.09,          // ~3-8 px/s at 60fps
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      frame++;

      for (const s of stars) {
        s.y -= s.drift;
        if (s.y + s.r < 0) s.y = cv.height + s.r;

        // subtle twinkle: ±20% opacity
        const twinkle = 1 + 0.2 * Math.sin(frame * s.phaseSpeed + s.phase);
        const opacity = Math.min(1, s.baseOpacity * twinkle);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,230,255,${opacity.toFixed(3)})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    const handleVisibility = () => {
      if (document.hidden) cancelAnimationFrame(animId);
      else animId = requestAnimationFrame(draw);
    };

    const handleResize = () => { resize(); buildStars(); };

    resize();
    buildStars();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
