"use client";

import { useEffect } from "react";

export default function AutoRefresh({ buildId }: { buildId: string }) {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { id } = await res.json();
        if (id && id !== buildId) location.reload();
      } catch {
        // ignore transient poll failures
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [buildId]);

  return null;
}
