import AutoRefresh from "./components/AutoRefresh";
import Menu from "./components/Menu";
import Rotation from "./components/Rotation";

export default function Home() {
  return (
    <>
      <Rotation>
        <Menu />
      </Rotation>
      <AutoRefresh buildId={__BUILD_ID__} />
    </>
  );
}
