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
  // Espresso in column 1; the section groups split across columns 2 and 3.
  const middle = sections.slice(0, 1);
  const right = sections.slice(1);

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
