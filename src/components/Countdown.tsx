import { useEffect, useState } from "react";

function fmt(n: number) {
  return n.toString().padStart(2, "0");
}

export function Countdown({ target, onZero }: { target: string | Date; onZero?: () => void }) {
  const targetTs = new Date(target).getTime();
  const [now, setNow] = useState(() => Date.now());

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
    if (diff === 0) onZero?.();
  }, [diff, onZero]);

  const parts = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: mins },
    { label: "Seconds", value: secs },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {parts.map((p) => (
        <div
          key={p.label}
          className="glass-strong rounded-2xl px-2 py-4 sm:px-4 sm:py-6 text-center"
        >
          <div className="font-display text-3xl sm:text-5xl gold-text tabular-nums leading-none">
            {fmt(p.value)}
          </div>
          <div className="mt-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {p.label}
          </div>
        </div>
      ))}
    </div>
  );
}
