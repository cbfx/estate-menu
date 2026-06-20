import styles from "../menu.module.css";
import type { Row, RowKind } from "../menu-data";

const rowClass: Record<RowKind, string> = {
  espresso: styles.espressoItem,
  addon: styles.addon,
  item: styles.item,
};

export default function MenuRow({ price, name, kind }: Row) {
  return (
    <div className={rowClass[kind]}>
      <span className={styles.price}>{price}</span>
      <span className={styles.name}>{name}</span>
    </div>
  );
}
