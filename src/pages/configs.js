import DefaultLayout from "../containers/DefaultLayout";
import MosaicGeneration from "./MosaicGeneration";
import MosaicGenerationLOD from "./LOD";

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
    Component: MosaicGenerationLOD,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
  },
];

export default routes;
