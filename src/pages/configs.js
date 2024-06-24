import DefaultLayout from "../containers/DefaultLayout";
import MosaicGeneration from "./MosaicGeneration";
import Grid from "./Grid";
import LOD from "./LOD";
import LOD2 from "./LOD2";
import Statistics from "./Statistics";
import ImageGallery from "./ImageGallery";

const routes = [
  {
    path: "/",
    Component: MosaicGeneration,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
  },
  {
    path: "/grid",
    Component: Grid,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
  },
  {
    path: "/lod",
    Component: LOD,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
  },
  {
    path: "/lod2",
    Component: LOD2,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
  },
  {
    path: "/statistics",
    Component: Statistics,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
  },
  {
    path: "/gallery",
    Component: ImageGallery,
    Layout: DefaultLayout,
    secured: false,
    exact: true,
  },
];

export default routes;
