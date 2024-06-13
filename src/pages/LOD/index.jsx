import React, { useState, useEffect } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import LazyLoad from "react-lazyload";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Box, Button } from "@chakra-ui/react";

// Generate random profiles
const generateProfiles = (count) => {
  const profiles = [];
  for (let i = 1; i <= count; i++) {
    profiles.push({
      id: i,
      name: `Name ${i}`,
      email: `email${i}@example.com`,
      phone: `123-456-789${i}`,
      imgSrc: `imgs/AI avatars/${i % 20000}.jpg`,
    });
  }
  return profiles;
};

const profiles = generateProfiles(20000);

const Cell = ({ columnIndex, rowIndex, style }) => {
  const index = rowIndex * 200 + columnIndex;
  const profile = profiles[index];

  return (
    <Box style={style} border="1px solid gray" width="200px" height="200px">
      {profile ? (
        <LazyLoad height={72} offset={100} once>
          <img
            src={profile.imgSrc}
            alt={`Avatar ${index}`}
            width={72}
            height={72}
          />
          <div>{profile.name}</div>
          <div>{profile.email}</div>
          <div>{profile.phone}</div>
        </LazyLoad>
      ) : (
        <Button>Reserve</Button>
      )}
    </Box>
  );
};

const App = () => {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <TransformWrapper
      defaultScale={0.3}
      defaultPositionX={0}
      defaultPositionY={0}
      minScale={0.3}
      initialScale={0.3}
      wheel={{ step: 0.2 }}
      centerOnInit
      centerZoomedOut
    >
      {({ zoomIn, zoomOut, resetTransform, centerView }) => (
        <div style={{ width: "100%", height: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "10px",
            }}
          >
            <Button onClick={() => zoomIn()} marginRight="5px">
              Zoom In
            </Button>
            <Button onClick={() => zoomOut()} marginRight="5px">
              Zoom Out
            </Button>
            <Button onClick={() => resetTransform()} marginRight="5px">
              Reset
            </Button>
            <Button onClick={() => centerView()}>Center</Button>
          </div>
          <TransformComponent>
            <Grid
              columnCount={200}
              columnWidth={200}
              height={dimensions.height}
              rowCount={200}
              rowHeight={200}
              width={dimensions.width}
            >
              {Cell}
            </Grid>
          </TransformComponent>
        </div>
      )}
    </TransformWrapper>
  );
};

export default App;
