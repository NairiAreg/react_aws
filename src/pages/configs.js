import DefaultLayout from "../containers/DefaultLayout";
import MosaicGeneration from "./MosaicGeneration";

const routes = [
  {
    path: "/",
    Component: MosaicGeneration,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
  },
  {
    path: "/lod",
    Component: MosaicGeneration,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
  },
];

export default routes;
