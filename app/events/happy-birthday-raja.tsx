"use client";

import type { EventConfig } from "./types";
import styles from "./events.module.css";

export const config: EventConfig = {
  id: "happy-birthday-raja",
  start: "2026-09-12T14:00:00Z", // Sept 12, 9:00am CDT
  end: "2026-09-12T17:00:00Z", // Sept 12, 12:00pm CDT
  durationSeconds: 60,
};

export default function HappyBirthdayRaja() {
  return (
    <div className={styles.slide}>
      <div className={styles.birthday}>HAPPY BIRTHDAY</div>
    </div>
  );
}
