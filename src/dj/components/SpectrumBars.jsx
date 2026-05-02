import { useEffect, useRef } from "react";

const neon = "#34d399";

export default function SpectrumBars({ engineRef, height = 56 }) {
  const canvasRef = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const draw = () => {
      const eng = engineRef?.current;
      const an = eng?.getAnalyser?.();
      if (!an) {
        raf.current = requestAnimationFrame(draw);
        return;
      }
      const n = an.frequencyBinCount;
      const data = new Uint8Array(n);
      an.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.fillStyle = "rgba(7,9,15,0.92)";
      ctx2d.fillRect(0, 0, w, h);
      const bars = 48;
      const step = Math.floor(n / bars);
      const bw = w / bars - 1;
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j];
        const v = sum / step / 255;
        const bh = Math.max(2, v * h * 0.95);
        const x = i * (bw + 1);
        const y = h - bh;
        const g = ctx2d.createLinearGradient(0, y, 0, h);
        g.addColorStop(0, neon);
        g.addColorStop(1, "rgba(52,211,153,0.15)");
        ctx2d.fillStyle = g;
        ctx2d.fillRect(x, y, bw - 0.5, bh);
      }
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [engineRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const p = canvas.parentElement;
      if (!p) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = p.clientWidth * dpr;
      canvas.height = height * dpr;
      canvas.style.height = `${height}px`;
    });
    ro.observe(canvas.parentElement || canvas);
    return () => ro.disconnect();
  }, [height]);

  return (
    <div style={{ width: "100%", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(52,211,153,0.2)" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} height={height} />
    </div>
  );
}
