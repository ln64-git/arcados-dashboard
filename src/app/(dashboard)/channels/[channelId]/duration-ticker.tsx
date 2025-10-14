"use client";
import { useEffect, useState } from "react";

export function DurationTicker({ start }: { start?: string | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!start) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [start]);

  if (!start) return null;
  const ms = Math.max(0, now - new Date(start).getTime());
  if (ms < 1000) return null; // hide when effectively zero
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const text = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  return <span className="tabular-nums text-xs text-muted-foreground">{text}</span>;
}


