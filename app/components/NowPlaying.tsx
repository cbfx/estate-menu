"use client";

import { useEffect, useState } from "react";
import styles from "../menu.module.css";

type State = { playing: boolean; title: string | null; artist: string | null };

const IDLE_TEXT = "♪ Nothing playing";

export default function NowPlaying() {
  const [state, setState] = useState<State>({ playing: false, title: null, artist: null });

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/now-playing", { cache: "no-store" });
        const data = (await res.json()) as State;
        if (!cancelled) setState(data);
      } catch {
        // keep last state on transient failure
      }
    }
    poll();
    const interval = setInterval(poll, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const text =
    state.playing && state.title
      ? `Now playing: ${state.title} — ${state.artist}`
      : IDLE_TEXT;

  return (
    <div className={styles.nowPlaying}>
      <div className={styles.nowPlayingTrack}>
        <span>{text}</span>
        <span aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}
