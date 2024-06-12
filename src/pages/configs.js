import DefaultLayout from "../containers/DefaultLayout";
import MosaicGeneration from "./MosaicGeneration";

const routes = [
  {
    Component: MosaicGeneration,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
    path: "/",
  },
];

export default routes;
