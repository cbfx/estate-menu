import styles from "../menu.module.css";
import { espresso, sections } from "../menu-data";
import MenuRow from "./MenuRow";

export default function Menu() {
  return (
    <div className={styles.container}>
      <div className={styles.primaryColumn}>
        <div className={styles.espressoSection}>
          {espresso.map((row, i) => (
            <MenuRow key={i} {...row} />
          ))}
        </div>
      </div>
      <div className={styles.secondaryColumn}>
        {sections.map((rows, i) => (
          <div key={i} className={styles.section}>
            <div className={styles.items}>
              {rows.map((row, j) => (
                <MenuRow key={j} {...row} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
