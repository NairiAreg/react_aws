import React, { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";

const App = () => {
  const viewerRef = useRef(null);

  useEffect(() => {
    console.log("Initializing OpenSeadragon");

    viewerRef.current = OpenSeadragon({
      id: "openseadragon-viewer",
      prefixUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/2.4.2/images/",
      tileSources: {
        type: "image",
        url: "/output_folder/output_folder.dzi", // Ensure this path is correct
      },
      showNavigator: true,
      navigatorPosition: "BOTTOM_RIGHT",
    });

    viewerRef.current.addHandler("open-failed", function (event) {
      console.error("OpenSeadragon open failed:", event);
    });

    viewerRef.current.addHandler("tile-load-failed", function (event) {
      console.error("Tile load failed:", event);
    });

    viewerRef.current.addHandler("canvas-click", function (event) {
      const viewportPoint = viewerRef.current.viewport.pointFromPixel(
        event.position
      );
      const imagePoint =
        viewerRef.current.viewport.viewportToImageCoordinates(viewportPoint);
      const imageWidth = viewerRef.current.source.dimensions.x;
      const imageHeight = viewerRef.current.source.dimensions.y;
      const tileX = Math.floor(imagePoint.x / (imageWidth / 72));
      const tileY = Math.floor(imagePoint.y / (imageHeight / 72));
      console.log(`Tile clicked: (${tileX}, ${tileY})`);
    });
  }, []);

  return (
    <div>
      <div
        id="openseadragon-viewer"
        style={{ width: "800px", height: "600px" }}
      ></div>
    </div>
  );
};

export default App;
