import AutoRefresh from "./components/AutoRefresh";
import Menu from "./components/Menu";

export default function Home() {
  return (
    <>
      <Menu />
      <AutoRefresh buildId={__BUILD_ID__} />
    </>
  );
}
