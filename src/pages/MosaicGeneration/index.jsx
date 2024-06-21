import React, { useState, useEffect, useRef } from "react";
import {
  ChakraProvider,
  Box,
  Button,
  useToast,
  Flex,
  Image as ChakraImage,
} from "@chakra-ui/react";
import pica from "pica";
import {
  correctAndDrawTile,
  createColorChart,
  findBestMatchTileIndex,
  generateBottomRightToTopLeftOrder,
  generateRandomOrder,
  generateSpiralOrder,
  generateTopLeftToBottomRightOrder,
  getAverageColor,
  groupColors,
  isTransparentAlphaChannel,
  loadImage,
} from "utils/imageUtils";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import MosaicForm from "./MosaicForm";

function MosaicGeneration() {
  const [mainImage, setMainImage] = useState(null);
  const [mainImageURL, setMainImageURL] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [reuseTilesCount, setReuseTilesCount] = useState(1);
  const [flip, setFlip] = useState();
  const [orderType, setOrderType] = useState("spiral");
  const [drawnTilesState, setDrawnTiles] = useState(0);
  const [drawInterval, setDrawInterval] = useState(30);
  const [radius, setRadius] = useState(0);
  const [edgesCut, setEdgesCut] = useState(1);
  const [tileWidth, setTileWidth] = useState(72);
  const [tileHeight, setTileHeight] = useState(72);
  const [imageWidth, setImageWidth] = useState(2880);
  const [tiles, setTiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [colorCorrection, setColorCorrection] = useState(0);

  const centerViewRef = useRef(null);

  const toast = useToast();

  useEffect(() => {
    const loadTiles = async () => {
      try {
        const tileImages = await Promise.all(
          imageFiles.map(async (file) => {
            try {
              const image = await loadImage(file);
              return image;
            } catch (error) {
              console.error(`Error loading image ${file.name}:`, error);
              return null; // Return null for missing images
            }
          })
        );
        const validTileImages = tileImages.filter((image) => image !== null); // Filter out null values
        setTiles(validTileImages);
      } catch (error) {
        console.error("Error loading tile images:", error);
      }
    };

    if (imageFiles.length > 0) {
      loadTiles();
    }
  }, [imageFiles]);

  useEffect(() => {
    const fetchMainImage = async () => {
      const imageUrl = `/imgs/targets/target.jpg`; // Adjust the file extension if necessary
      setMainImageURL(imageUrl);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return;
      }
      const blob = await response.blob();
      const file = new File([blob], `target.jpg`, { type: blob.type });
      setMainImage(file);
    };
    fetchMainImage();
  }, []);

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    setMainImage(file);
    setMainImageURL(URL.createObjectURL(file));
  };

  const handleTileImagesChange = (e) => {
    if (e.target.files.length === 0) {
      return;
    }

    setImageFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mainImage || tiles.length === 0) {
      toast({
        title: "Missing images.",
        description: "Please upload the main image and tile images.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    await createMosaic(mainImage, tiles, +tileWidth, +tileHeight);
    setIsLoading(false);
  };

  const loadImagesFromDirectory = async (count = 5000) => {
    setIsLoading(true);
    const images = [];
    let i = 1;

    // Attempt to load up to 1000 images, adjust this limit as necessary
    while (i <= count) {
      try {
        const imageUrl = `/imgs/gev_friends/${i}.jpg`; // Adjust the file extension if necessary
        const response = await fetch(imageUrl);
        if (!response.ok) {
          i++;
          continue;
        }
        const blob = await response.blob();
        const file = new File([blob], `${i}.jpg`, { type: blob.type });
        images.push(file);
      } catch (error) {
        console.error(`Error loading image ${i}:`, error);
      }
      i++;
    }

    setImageFiles(images);
    setIsLoading(false);
  };

  const createMosaic = async (mainImageFile, tiles, tileWidth, tileHeight) => {
    try {
      console.log("Starting createMosaic");
      setProgress(0);

      console.log("Loading main image...");
      const originalImg = await loadImage(mainImageFile);
      const picaInstance = pica();

      // Create a canvas to resize the main image
      const resizedCanvas = document.createElement("canvas");

      const aspectRatio = originalImg.height / originalImg.width;
      // resizedCanvas.width = originalImg.width;
      resizedCanvas.width = imageWidth;
      resizedCanvas.height = Math.round(resizedCanvas.width * aspectRatio);

      // Use pica to resize the main image
      console.log("Resizing main image...");
      await picaInstance.resize(originalImg, resizedCanvas);

      // Draw the resized image on a new canvas
      const mainCanvas = document.createElement("canvas");
      const mainCtx = mainCanvas.getContext("2d", { willReadFrequently: true });
      mainCanvas.width = resizedCanvas.width;
      mainCanvas.height = resizedCanvas.height;
      mainCtx.drawImage(resizedCanvas, 0, 0);

      // Create a canvas for the mosaic
      const mosaicCanvas = document.createElement("canvas");
      mosaicCanvas.width = mainCanvas.width;
      mosaicCanvas.height = mainCanvas.height;
      const mosaicCtx = mosaicCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      // // Disable image smoothing for sharp edges
      // mosaicCtx.imageSmoothingEnabled = false;

      // Processing tiles
      console.log("Processing tiles...");
      let processedTiles = 0;
      const tileCanvases = await Promise.all(
        tiles.map(async (tile, index) => {
          const tileCanvas = document.createElement("canvas");
          tileCanvas.width = tileWidth;
          tileCanvas.height = tileHeight;
          const tileCtx = tileCanvas.getContext("2d", {
            willReadFrequently: true,
          });

          await picaInstance.resize(tile, tileCanvas);
          processedTiles++;
          setProgress(Math.round((processedTiles / tiles.length) * 50));
          console.log(`Processed tile ${index + 1}/${tiles.length}`);

          return {
            canvas: tileCanvas,
            color: getAverageColor(
              tileCtx.getImageData(0, 0, tileWidth, tileHeight).data
            ),
            count: 0, // Track how many times this tile has been used
            positions: [], // Track positions where the tile is used
          };
        })
      );
      console.log("tileCanvases", tileCanvases);

      const availableTiles = [...tileCanvases];
      const delay = () => new Promise((resolve) => setTimeout(resolve, 0));

      const totalTilesX = Math.ceil(mainCanvas.width / tileWidth);
      const totalTilesY = Math.ceil(mainCanvas.height / tileHeight);
      const totalTiles = totalTilesX * totalTilesY;
      let currentTile = 0;
      let adjacentClones = 0;

      // Custom image for transparent parts
      // TODO fix  when outline feature is needed, this way only works locally, in hosted version it cannot find image /imgs/sqr.jpeg
      // const customImage = new Image();
      // customImage.src = `/imgs/sqr.jpeg`; // Path to your custom image
      // console.log("Loading custom image...");
      // await new Promise((resolve, reject) => {
      //   customImage.onload = () => {
      //     console.log("Custom image loaded successfully");
      //     resolve();
      //   };
      //   customImage.onerror = () => {
      //     console.error("Error loading custom image");
      //     reject(new Error("Error loading custom image"));
      //   };
      // });

      let order;
      switch (orderType) {
        case "spiral":
          order = generateSpiralOrder(totalTilesX, totalTilesY);
          break;
        case "random":
          order = generateRandomOrder(totalTilesX, totalTilesY);
          break;
        case "bottom-top":
          order = generateBottomRightToTopLeftOrder(totalTilesX, totalTilesY);
          break;
        default:
          order = generateTopLeftToBottomRightOrder(totalTilesX, totalTilesY);
          break;
      }

      console.log("Creating mosaic...");
      const updateInterval = drawInterval; // Update the canvas every drawInterval cycles
      let drawnTiles = 0;
      const mainImageColors = [];
      const tileUsage = {};

      for (const pos of order) {
        const progressPercent =
          50 + Math.round((currentTile / totalTiles) * 50);
        setProgress(() => progressPercent);
        await delay(); //! This is THE ONLY WAY to update the progress bar

        const x = pos.x * tileWidth;
        const y = pos.y * tileHeight;
        currentTile++;

        if (availableTiles.length === 0) {
          console.warn("Not enough unique tiles to fill the mosaic.");
          break;
        }

        const { data } = mainCtx.getImageData(x, y, tileWidth, tileHeight);
        const avgColor = getAverageColor(data, true);
        mainImageColors.push(avgColor);

        // Check if the square is transparent
        const imageData = mainCtx.getImageData(x, y, tileWidth, tileHeight);
        const isTransparent = [avgColor.r, avgColor.g, avgColor.b].every(
          (c) => c === 0
        );

        if (isTransparentAlphaChannel(imageData, edgesCut)) {
          // TODO Can add a custom image here
          if (!isTransparent) {
            // mosaicCtx.drawImage(customImage, x, y, tileWidth, tileHeight);
            // TODO Here is my mosaic image edges, where the transparent parts are making the average darker
          }
          continue;
        }

        drawnTiles++;
        const bestMatchIndex = findBestMatchTileIndex(avgColor, availableTiles);
        const bestMatchTile = availableTiles[bestMatchIndex];

        const isAdjacent = (pos) => {
          const deltaX = Math.abs(pos.x - x);
          const deltaY = Math.abs(pos.y - y);
          return deltaX <= radius * tileWidth && deltaY <= radius * tileHeight;
        };

        // Parameters for color correction
        if (bestMatchTile.positions.some(isAdjacent)) {
          // Filter available tiles to exclude adjacent ones
          const nonAdjacentTiles = availableTiles.filter(
            (tile) =>
              !tile.positions.some(isAdjacent) &&
              (tile.count < reuseTilesCount || +reuseTilesCount === 0)
          );

          // Find the best match tile among the non-adjacent tiles
          const bestNonAdjacentMatchIndex = findBestMatchTileIndex(
            avgColor,
            nonAdjacentTiles
          );
          const bestNonAdjacentMatchTile =
            nonAdjacentTiles[bestNonAdjacentMatchIndex];

          if (bestNonAdjacentMatchTile?.canvas) {
            correctAndDrawTile(
              bestNonAdjacentMatchTile,
              avgColor,
              x,
              y,
              mosaicCtx,
              tileWidth,
              tileHeight,
              +colorCorrection,
              mainCtx,
              flip
            );
            bestNonAdjacentMatchTile.count += 1;
            bestNonAdjacentMatchTile.positions.push({ x, y });

            const colorKey = JSON.stringify(bestNonAdjacentMatchTile.color);
            tileUsage[colorKey] = (tileUsage[colorKey] || 0) + 1;

            if (
              bestNonAdjacentMatchTile.count >= reuseTilesCount &&
              reuseTilesCount > 0
            ) {
              availableTiles.splice(
                availableTiles.indexOf(bestNonAdjacentMatchTile),
                1
              );
            }
          } else {
            adjacentClones++;
            // Fallback to drawing the best match tile if no suitable non-adjacent match found
            correctAndDrawTile(
              bestMatchTile,
              avgColor,
              x,
              y,
              mosaicCtx,
              tileWidth,
              tileHeight,
              +colorCorrection,
              mainCtx,
              flip
            );
            bestMatchTile.count += 1;
            bestMatchTile.positions.push({ x, y });

            const colorKey = JSON.stringify(bestMatchTile.color);
            tileUsage[colorKey] = (tileUsage[colorKey] || 0) + 1;

            if (bestMatchTile.count >= reuseTilesCount && reuseTilesCount > 0) {
              availableTiles.splice(bestMatchIndex, 1);
            }
          }
        } else {
          correctAndDrawTile(
            bestMatchTile,
            avgColor,
            x,
            y,
            mosaicCtx,
            tileWidth,
            tileHeight,
            +colorCorrection,
            mainCtx,
            flip
          );
          bestMatchTile.count += 1;
          bestMatchTile.positions.push({ x, y });

          const colorKey = JSON.stringify(bestMatchTile.color);
          tileUsage[colorKey] = (tileUsage[colorKey] || 0) + 1;

          if (bestMatchTile.count >= reuseTilesCount && reuseTilesCount > 0) {
            availableTiles.splice(bestMatchIndex, 1);
          }
        }

        // Update the mosaic canvas every `updateInterval` cycles
        if (currentTile % updateInterval === 0) {
          // Draw the current state of the mosaic canvas to the screen
          const previewCanvas = document.getElementById("previewCanvas");
          const previewCtx = previewCanvas.getContext("2d", {
            willReadFrequently: true,
          });
          previewCanvas.width = mosaicCanvas.width;
          previewCanvas.height = mosaicCanvas.height;
          previewCtx.drawImage(mosaicCanvas, 0, 0);
          if (centerViewRef.current) {
            centerViewRef.current();
          }
        }
      }

      setDrawnTiles(drawnTiles);

      if (adjacentClones > 0) {
        toast({
          title: `${adjacentClones} adjacent clones.`,
          description: `${adjacentClones} tiles were adjacent to themselves because there was not enough space / tiles.`,
          status: "info",
          duration: 5000,
          isClosable: true,
        });
      }

      // Final draw of the completed mosaic
      const previewCanvas = document.getElementById("previewCanvas");
      const previewCtx = previewCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      previewCanvas.width = mosaicCanvas.width;
      previewCanvas.height = mosaicCanvas.height;
      previewCtx.drawImage(mosaicCanvas, 0, 0);

      const mainImageColorStats = groupColors(mainImageColors);
      createColorChart(mainImageColorStats, "colorChart");

      // Convert the final mosaic canvas to a blob and create a URL
      return new Promise((resolve) => {
        mosaicCanvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          resolve(url);
        });
      });
    } catch (error) {
      console.error("Error in createMosaic:", error);
      toast({
        title: "Error",
        description:
          "An error occurred while creating the mosaic. Check console for details.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <ChakraProvider>
      <Box p={5}>
        <MosaicForm
          {...{
            handleMainImageChange,
            handleTileImagesChange,
            loadImagesFromDirectory,
            reuseTilesCount,
            setReuseTilesCount,
            flip,
            setFlip,
            orderType,
            setOrderType,
            drawInterval,
            setDrawInterval,
            radius,
            setRadius,
            edgesCut,
            setEdgesCut,
            tileWidth,
            setTileWidth,
            tileHeight,
            setTileHeight,
            imageWidth,
            setImageWidth,
            handleSubmit,
            isLoading,
            mainImage,
            imageFiles,
            drawnTilesState,
            colorCorrection,
            progress,
            tiles,
            setColorCorrection,
          }}
        />
        <Flex mt={5} justify="center" flexWrap="wrap">
          {mainImageURL && (
            <ChakraImage w="1000px" src={mainImageURL} alt="Main" mx={2} />
          )}
          <TransformWrapper
            defaultScale={0.3}
            minScale={0.3}
            initialScale={0.3}
            wheel={{ step: 0.2 }}
            centerOnInit={true}
            centerZoomedOut={true}
            onInit={(ref) => {
              centerViewRef.current = ref.centerView;
            }}
          >
            {({ zoomIn, zoomOut, resetTransform, centerView }) => (
              <Flex direction="column">
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
                  <Button onClick={() => centerViewRef.current()}>
                    Center2
                  </Button>
                </div>
                <TransformComponent
                  wrapperStyle={{
                    width: "1000px",
                    maxWidth: "100%",
                    maxHeight: "1000px",
                    border: "1px solid",
                  }}
                >
                  <canvas id="previewCanvas"></canvas>
                </TransformComponent>
              </Flex>
            )}
          </TransformWrapper>
          <canvas id="colorChart"></canvas>
        </Flex>
      </Box>
    </ChakraProvider>
  );
}

export default MosaicGeneration;
