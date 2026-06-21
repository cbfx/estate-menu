import styles from "../menu.module.css";
import { espresso, sections, type Row } from "../menu-data";
import MenuRow from "./MenuRow";
import { resolvePrice } from "../prices";

function Section({ rows }: { rows: Row[] }) {
  return (
    <div className={styles.section}>
      <div className={styles.items}>
        {rows.map((row, j) => (
          <MenuRow key={j} {...row} price={resolvePrice(row)} />
        ))}
      </div>
    </div>
  );
}

export default function Menu() {
  // Col 1: espresso + filter. Col 2 (middle): specialty + milk. Col 3 (right): the rest.
  const middle = sections.slice(0, 2);
  const right = sections.slice(2);

  return (
    <div className={styles.container}>
      <div className={styles.primaryColumn}>
        <div className={styles.espressoSection}>
          {espresso.map((row, i) => (
            <MenuRow key={i} {...row} price={resolvePrice(row)} />
          ))}
        </div>
      </div>
      <div className={styles.secondaryColumn}>
        {middle.map((rows, i) => (
          <Section key={i} rows={rows} />
        ))}
      </div>
      <div className={styles.secondaryColumn}>
        {right.map((rows, i) => (
          <Section key={i} rows={rows} />
        ))}
      </div>
    </div>
  );
}
