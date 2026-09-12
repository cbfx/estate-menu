"use client";

import type { EventConfig } from "../types";
import styles from "./happy-birthday-raja.module.css";
import rajaImg from "./raja.jpg";

export const config: EventConfig = {
  id: "happy-birthday-raja",
  start: "2026-09-12T14:00:00Z", // Sept 12, 9:00am CDT
  end: "2026-09-12T17:00:00Z", // Sept 12, 12:00pm CDT
  durationSeconds: 15,
};

export default function HappyBirthdayRaja() {
  return (
    <div className={styles.slide}>
      <div className={styles.copy}>
        <div className={styles.headline}>Happy birthday, Raja!</div>
        <div className={styles.subtext}>Enjoy cold brew, drip, and pup cups on us! Thanks for coming!</div>
      </div>
      <div className={styles.portrait}>
        <img src={rajaImg.src} alt="Raja" />
      </div>
    </div>
  );
}
