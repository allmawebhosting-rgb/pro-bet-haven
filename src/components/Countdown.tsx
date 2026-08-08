import { useEffect, useRef, useState } from "react";

function fmt(n: number) {
  return n.toString().padStart(2, "0");
}

export function Countdown({ target, onZero, compact }: { target: string | Date; onZero?: () => void; compact?: boolean }) {
  const targetTs = new Date(target).getTime();
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, targetTs - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  const mins = Math.floor((diff / 60_000) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  useEffect(() => {
    if (diff === 0 && !firedRef.current) {
      firedRef.current = true;
      onZero?.();
    }
    if (diff > 0) firedRef.current = false;
  }, [diff, onZero]);

  const parts = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: mins },
    { label: "Seconds", value: secs },
  ];

  if (compact) {
    return (
      <span className="tabular-nums">
        {days > 0 ? `${days}d ` : ""}{fmt(hours)}:{fmt(mins)}:{fmt(secs)}
      </span>
    );
  }

  return (
    <div className="countdown-grid grid grid-cols-4 gap-2 sm:gap-3">
      {parts.map((p) => (
        <div
          key={p.label}
          className={`countdown-unit glass-strong rounded-2xl px-2 py-3.5 sm:px-4 sm:py-5 text-center ${p.label === "Seconds" ? "countdown-unit-live" : ""}`}
        >
          <div className="countdown-number font-display text-3xl sm:text-5xl gold-text tabular-nums leading-none">
            {fmt(p.value)}
          </div>
          <div className="mt-2 text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-muted-foreground/90">
            {p.label}
          </div>
        </div>
      ))}
    </div>
  );
}
