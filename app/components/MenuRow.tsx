import styles from "../menu.module.css";
import type { Row } from "../menu-data";

export default function MenuRow({ price, name, kind }: Row) {
  if (kind === "header") {
    return <div className={styles.header}>{name}</div>;
  }

  if (kind === "espresso") {
    return (
      <div className={styles.espressoItem}>
        <span className={styles.name}>{name}</span>
        <span className={styles.price}>{price}</span>
      </div>
    );
  }

  const cls =
    kind === "addon" ? styles.addon : kind === "modifier" ? styles.modifier : styles.item;
  return (
    <div className={cls}>
      <span className={styles.name}>{name}</span>
      <span className={styles.price}>{price}</span>
    </div>
  );
}
