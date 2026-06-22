import styles from "../menu.module.css";
import featured from "../featured.json";

type FeaturedData = { name?: string | null; imageUrl?: string | null };

export default function Featured() {
  const data = featured as FeaturedData;
  if (!data.imageUrl) return null;

  return (
    <div className={styles.featured}>
      <img src={data.imageUrl} alt={data.name ?? "Espresso of the day"} />
    </div>
  );
}
