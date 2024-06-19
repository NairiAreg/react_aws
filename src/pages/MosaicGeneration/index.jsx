import React, { useState, useEffect } from "react";
import {
  ChakraProvider,
  Box,
  Button,
  Input,
  FormControl,
  FormLabel,
  Progress,
  useToast,
  VStack,
  HStack,
  Heading,
  Flex,
  Image as ChakraImage,
  Text,
  IconButton,
  Alert,
  AlertIcon,
  Checkbox,
  RadioGroup,
  Stack,
  Radio,
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";
import pica from "pica";

import TicTacToeBoard from "components/TicTacToeBoard";
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
import SquareInfo from "components/SquareInfo";
import CustomSlider from "components/CustomSlider";
import { Link } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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

  const toast = useToast();

  useEffect(() => {
    const loadTiles = async () => {
      const tileImages = await Promise.all(
        imageFiles.map((file) => loadImage(file))
      );
      setTiles(tileImages);
    };
    if (imageFiles.length > 0) {
      loadTiles();
    }
  }, [imageFiles]);

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    setMainImage(file);
    setMainImageURL(URL.createObjectURL(file));
  };

  const handleTileImagesChange = (e) => {
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

  const loadImagesFromDirectory = async (count) => {
    setIsLoading(true);
    const images = [];
    let i = 1;

    while (images.length < count) {
      const imageUrl = `/imgs/gev_friends/${i}.jpg`; // Adjust the file extension if necessary
      const response = await fetch(imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        const file = new File([blob], `${i}.jpg`, { type: blob.type });
        images.push(file);
      }
      i++;
    }

    setImageFiles(images);
    setIsLoading(false);
  };

  const createMosaic = async (mainImageFile, tiles, tileWidth, tileHeight) => {
    setProgress(0);
    const originalImg = await loadImage(mainImageFile);
    const picaInstance = pica();

    // Create a canvas to resize the main image
    const resizedCanvas = document.createElement("canvas");

    const aspectRatio = originalImg.height / originalImg.width;
    // resizedCanvas.width = originalImg.width;
    resizedCanvas.width = imageWidth;
    resizedCanvas.height = Math.round(resizedCanvas.width * aspectRatio);

    // Use pica to resize the main image
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

    let processedTiles = 0;
    const tileCanvases = await Promise.all(
      tiles.map((tile) => {
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = tileWidth;
        tileCanvas.height = tileHeight;
        const tileCtx = tileCanvas.getContext("2d", {
          willReadFrequently: true,
        });

        return picaInstance.resize(tile, tileCanvas).then(() => {
          processedTiles++;
          setProgress(Math.round((processedTiles / imageFiles.length) * 50));
          return {
            canvas: tileCanvas,
            color: getAverageColor(
              tileCtx.getImageData(0, 0, tileWidth, tileHeight).data
            ),
            count: 0, // Track how many times this tile has been used
            positions: [], // Track positions where the tile is used
          };
        });
      })
    );

    const availableTiles = [...tileCanvases];
    const delay = () => new Promise((resolve) => setTimeout(resolve, 0));

    const totalTilesX = Math.ceil(mainCanvas.width / tileWidth);
    const totalTilesY = Math.ceil(mainCanvas.height / tileHeight);
    const totalTiles = totalTilesX * totalTilesY;
    let currentTile = 0;
    let adjacentClones = 0;

    // Custom image for transparent parts
    const customImage = new Image();
    customImage.src = "imgs/sqr.jpeg"; // Path to your custom image
    await new Promise((resolve) => {
      customImage.onload = resolve;
    });

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

    // Create the mosaic in spiral order
    const updateInterval = drawInterval; // Update the canvas every drawInterval cycles
    let drawnTiles = 0;
    const mainImageColors = [];
    const tileUsage = {};

    for (const pos of order) {
      const progressPercent = 50 + Math.round((currentTile / totalTiles) * 50);
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
          //   mosaicCtx.drawImage(customImage, x, y, tileWidth, tileHeight);
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

    // Create and display statistics
    const mainImageColorStats = groupColors(mainImageColors);
    //? tile usage info
    // const tileUsageStats = groupColors(
    //   Object.keys(tileUsage).map((key) => JSON.parse(key))
    // );

    // console.log("Most wanted colors in the main image:", mainImageColorStats);
    // console.log("Tile usage statistics:", tileUsageStats);

    // Call these functions with the statistics generated above
    //? tile usage info
    createColorChart(mainImageColorStats, "colorChart");

    return new Promise((resolve) => {
      mosaicCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      });
    });
  };

  return (
    <ChakraProvider>
      <Box p={5}>
        <VStack spacing={5} maxW="600px" mx="auto">
          <Heading>Mosaic Image Generator</Heading>
          <Link to="/lod">LOD</Link>
          <FormControl id="mainImage">
            <FormLabel>Main Image</FormLabel>
            <Box
              border="1px dashed"
              borderColor="gray.300"
              p={3}
              borderRadius="md"
            >
              <Flex align="center">
                <IconButton
                  icon={<FaFileUpload />}
                  aria-label="Upload Main Image"
                  as="label"
                  htmlFor="main-image-input"
                  colorScheme="teal"
                  variant="outline"
                />
                <Input
                  id="main-image-input"
                  type="file"
                  onChange={handleMainImageChange}
                  hidden
                />
                <Text ml={3}>
                  {mainImage ? mainImage.name : "Click to upload main image"}
                </Text>
              </Flex>
            </Box>
          </FormControl>
          <FormControl id="tileImages">
            <FormLabel>Tile Images</FormLabel>
            <Box
              border="1px dashed"
              borderColor="gray.300"
              p={3}
              borderRadius="md"
            >
              <Flex align="center">
                <IconButton
                  icon={<FaFileUpload />}
                  aria-label="Upload Tile Images"
                  as="label"
                  htmlFor="tile-images-input"
                  colorScheme="teal"
                  variant="outline"
                />
                <Input
                  id="tile-images-input"
                  type="file"
                  multiple
                  onChange={handleTileImagesChange}
                  hidden
                />
                <Text ml={3}>
                  {imageFiles.length > 0
                    ? `${imageFiles.length} files selected`
                    : "Click to upload tile images"}
                </Text>
              </Flex>
            </Box>
          </FormControl>
          <Flex gap={2} alignItems="center">
            Load
            {[50, 100, 200, 500, 1000, 5000].map((count) => (
              <Button
                key={count}
                onClick={() => loadImagesFromDirectory(count)}
                isLoading={isLoading}
              >
                {count}
              </Button>
            ))}
            Images
          </Flex>
          <HStack spacing={5}>
            <FormControl id="tileWidth">
              <FormLabel>Tile Width</FormLabel>
              <Input
                type="number"
                value={tileWidth}
                onChange={(e) => setTileWidth(e.target.value)}
              />
            </FormControl>
            <FormControl id="tileHeight">
              <FormLabel>Tile Height</FormLabel>
              <Input
                type="number"
                value={tileHeight}
                onChange={(e) => setTileHeight(e.target.value)}
              />
            </FormControl>
            <FormControl id="tileHeight">
              <FormLabel>Image width</FormLabel>
              <Input
                type="number"
                value={imageWidth}
                onChange={(e) => setImageWidth(e.target.value)}
              />
            </FormControl>
          </HStack>
          <SquareInfo
            width={tileWidth}
            height={tileHeight}
            imageWidth={imageWidth}
          />
          {drawnTilesState > 0 && (
            <Alert status="success">
              <AlertIcon />
              Used {drawnTilesState} tiles to create the mosaic.
            </Alert>
          )}
          <FormControl id="reuseCount">
            <FormLabel>
              Reuse Count: {reuseTilesCount > 0 ? reuseTilesCount : "Infinity"}
            </FormLabel>
            <CustomSlider
              max={100}
              value={reuseTilesCount}
              onChange={(value) => setReuseTilesCount(value)}
              thumbColor="teal.500"
            />
          </FormControl>

          <FormControl id="drawAnimation">
            <FormLabel>
              Draw animation: {drawInterval > 0 ? drawInterval : "None"}
            </FormLabel>
            <CustomSlider
              max={100}
              value={drawInterval}
              onChange={(value) => setDrawInterval(value)}
              thumbColor="blue.500"
            />
          </FormControl>

          <FormControl id="adjacentBlockingRadius">
            <FormLabel>Adjacent blocking radius: {radius}</FormLabel>
            <CustomSlider
              max={10}
              value={radius}
              onChange={(value) => setRadius(value)}
              thumbColor="red.500"
            />
          </FormControl>

          <TicTacToeBoard size={1 + radius * 2} />

          <FormControl id="cutFromEdges">
            <FormLabel>Cut from edges: {edgesCut}</FormLabel>
            <CustomSlider
              min={1}
              max={255}
              value={edgesCut}
              onChange={(value) => setEdgesCut(value)}
              thumbColor="yellow.500"
            />
            <Box
              w="200px"
              h="200px"
              borderColor="tomato"
              bg="black"
              borderStyle="solid"
              borderWidth={`${edgesCut / 10}px`}
              mx="auto"
              mt={2}
            />
          </FormControl>
          <FormControl id="colorCorrection">
            <FormLabel>Color correction: {colorCorrection * 100}%</FormLabel>
            <CustomSlider
              step={0.1}
              max={1}
              value={colorCorrection}
              onChange={(value) => setColorCorrection(value)}
              thumbColor="teal.500"
            />
          </FormControl>
          <FormControl id="flipToggle">
            <Checkbox
              isChecked={flip}
              onChange={(e) => setFlip(e.target.checked)}
              colorScheme="teal"
            >
              Flip Tiles
            </Checkbox>
          </FormControl>
          <FormControl as="fieldset">
            <FormLabel as="legend">Select Tile Drawing Order</FormLabel>
            <RadioGroup onChange={setOrderType} value={orderType}>
              <Stack direction="row">
                <Radio value="spiral">Spiral 🌀</Radio>
                <Radio value="random">Random 🎲</Radio>
                <Radio value="top-bottom">Top to bottom ↘︎</Radio>
                <Radio value="bottom-top">Bottom to top ↖️</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>
          {isLoading && <Progress value={progress} size="lg" w="100%" />}
          <Button
            colorScheme="teal"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Create Mosaic
          </Button>
        </VStack>
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
