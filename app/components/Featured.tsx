import styles from "../menu.module.css";
import featured from "../featured.json";

type FeaturedData = { name?: string | null; imageUrl?: string | null };

export default function Featured() {
  const data = featured as FeaturedData;
  if (!data.imageUrl) return null;

  return (
    <div className={styles.featured}>
      <div className={styles.wifi}>
        <svg
          className={styles.wifiIcon}
          viewBox="0 0 24 24"
          width="1em"
          height="1em"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M2 8.5a15 15 0 0 1 20 0" />
          <path d="M5 12a10 10 0 0 1 14 0" />
          <path d="M8.5 15.5a5 5 0 0 1 7 0" />
          <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
        </svg>
        coffeetime1234
      </div>
      <div className={styles.section}>
        <div className={styles.header}>On espresso bar:</div>
        <div className={styles.items}>
          <div className={styles.item}>
            <span className={styles.name}>{data.name}</span>
          </div>
        </div>
      </div>
      <img src={data.imageUrl} alt={data.name ?? "Espresso of the day"} />
    </div>
  );
}
