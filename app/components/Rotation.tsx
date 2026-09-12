"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { slides } from "../events/registry";
import { activeSlides } from "../events/schedule";
import type { Slide } from "../events/types";
import styles from "../rotation.module.css";

const REGULAR_SECONDS = 60;

// One phase = a screen shown for a fixed number of seconds.
type Phase = { key: string; node: React.ReactNode; seconds: number };

const enter = { opacity: 0, scale: 0.92, filter: "blur(12px)" };
const center = { opacity: 1, scale: 1, filter: "blur(0px)" };
const leave = { opacity: 0, scale: 1.08, filter: "blur(16px)" };
const transition = { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const };

export default function Rotation({ children }: { children: React.ReactNode }) {
  // Build the phase list for one full cycle, given the currently active slides.
  function buildCycle(active: Slide[]): Phase[] {
    const regular: Phase = { key: "regular", node: children, seconds: REGULAR_SECONDS };
    if (active.length === 0) return [regular];
    return [
      regular,
      ...active.map((s) => ({
        key: s.config.id,
        node: <s.Component />,
        seconds: s.config.durationSeconds,
      })),
    ];
  }

  const [cycle, setCycle] = useState<Phase[]>(() =>
    buildCycle(activeSlides(slides, Date.now())),
  );
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const phase = cycle[index];
    if (!phase) return;

    // If this is the last phase of the cycle, recompute the active set for the
    // next cycle (events entering/leaving their window take effect here).
    timer.current = setTimeout(() => {
      const isLast = index >= cycle.length - 1;
      if (isLast) {
        const next = buildCycle(activeSlides(slides, Date.now()));
        setCycle(next);
        setIndex(0);
      } else {
        setIndex((i) => i + 1);
      }
    }, phase.seconds * 1000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, index]);

  const phase = cycle[index] ?? cycle[0];

  return (
    <div className={styles.stage}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={phase.key}
          className={styles.screen}
          initial={enter}
          animate={center}
          exit={leave}
          transition={transition}
        >
          {phase.node}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
