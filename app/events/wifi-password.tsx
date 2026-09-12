"use client";

import type { EventConfig } from "./types";
import styles from "./wifi-password.module.css";

export const config: EventConfig = {
  id: "wifi-password",
  // Permanent rotation item — always active, cycles in all day.
  start: "2000-01-01T00:00:00Z",
  end: "2999-01-01T00:00:00Z",
  durationSeconds: 12,
};

export default function WifiPassword() {
  return (
    <div className={styles.slide}>
      <div className={styles.eyebrow}>Wi-Fi password</div>
      <div className={styles.password}>coffeetime1234</div>
    </div>
  );
}
