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
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";
import pica from "pica";

import TicTacToeBoard from "./components/TicTacToeBoard";
import {
  findBestMatchTileIndex,
  getAverageColor,
  isTransparentAlphaChannel,
  loadImage,
} from "./utils/imageUtils";
import SquareInfo from "./components/SquareInfo";

function App() {
  const [mainImage, setMainImage] = useState(null);
  const [mainImageURL, setMainImageURL] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [reuseTilesCount, setReuseTilesCount] = useState(0);
  const [drawnTilesState, setDrawnTiles] = useState(0);
  const [radius, setRadius] = useState(0);
  const [edgesCut, setEdgesCut] = useState(1);
  const [tileWidth, setTileWidth] = useState(10);
  const [tileHeight, setTileHeight] = useState(10);
  const [mosaicImage, setMosaicImage] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  useEffect(() => {
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

  const loadTiles = async () => {
    const tileImages = await Promise.all(
      imageFiles.map((file) => loadImage(file))
    );
    setTiles(tileImages);
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

    const mosaic = await createMosaic(
      mainImage,
      tiles,
      +tileWidth,
      +tileHeight
    );
    setMosaicImage(mosaic);
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
    resizedCanvas.width = 1000;
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

    // Create the mosaic
    let drawnTiles = 0;
    for (let y = 0; y < mainCanvas.height; y += tileHeight) {
      const progressPercent = 50 + Math.round((currentTile / totalTiles) * 50);
      setProgress(() => progressPercent);
      await delay(); //! This is THE ONLY WAY to update the progress bar
      for (let x = 0; x < mainCanvas.width; x += tileWidth) {
        currentTile++;
        if (availableTiles.length === 0) {
          console.warn("Not enough unique tiles to fill the mosaic.");
          break;
        }
        const { data } = mainCtx.getImageData(x, y, tileWidth, tileHeight);
        const avgColor = getAverageColor(data, true);

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

        if (bestMatchTile.positions.some(isAdjacent)) {
          // Find another tile if this one is adjacent
          const nonAdjacentTile = availableTiles.find(
            (tile) =>
              !tile.positions.some(isAdjacent) &&
              (tile.count < reuseTilesCount || +reuseTilesCount === 0)
          );

          if (nonAdjacentTile?.canvas) {
            mosaicCtx.drawImage(
              nonAdjacentTile.canvas,
              x,
              y,
              tileWidth,
              tileHeight
            );
            nonAdjacentTile.count += 1;
            nonAdjacentTile.positions.push({ x, y });
            if (
              nonAdjacentTile.count >= reuseTilesCount &&
              reuseTilesCount > 0
            ) {
              availableTiles.splice(availableTiles.indexOf(nonAdjacentTile), 1);
            }
          } else {
            adjacentClones++;

            mosaicCtx.drawImage(
              bestMatchTile.canvas,
              x,
              y,
              tileWidth,
              tileHeight
            );
            bestMatchTile.count += 1;
            bestMatchTile.positions.push({ x, y });
            if (bestMatchTile.count >= reuseTilesCount && reuseTilesCount > 0) {
              availableTiles.splice(bestMatchIndex, 1);
            }
          }
        } else {
          mosaicCtx.drawImage(
            bestMatchTile.canvas,
            x,
            y,
            tileWidth,
            tileHeight
          );
          bestMatchTile.count += 1;
          bestMatchTile.positions.push({ x, y });
          if (bestMatchTile.count >= reuseTilesCount && reuseTilesCount > 0) {
            availableTiles.splice(bestMatchIndex, 1);
          }
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
          </HStack>
          <SquareInfo width={tileWidth} height={tileHeight} />
          {drawnTilesState > 0 && (
            <Alert status="success">
              <AlertIcon />
              Used {drawnTilesState} tiles to create the mosaic.
            </Alert>
          )}
          <Button
            colorScheme="teal"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Create Mosaic
          </Button>
          <FormControl id="reuseCount">
            <FormLabel>
              Reuse Count: {reuseTilesCount > 0 ? reuseTilesCount : "Infinity"}
            </FormLabel>
            <Input
              type="range"
              min={0}
              max={100}
              value={reuseTilesCount || 0}
              onChange={(e) => setReuseTilesCount(e.target.value)}
            />
          </FormControl>
          <FormControl id="reuseCount">
            <FormLabel>Adjacent blocking radius: {radius}</FormLabel>
            <Input
              type="range"
              min={0}
              max={5}
              value={radius || 0}
              onChange={(e) => setRadius(e.target.value)}
            />
          </FormControl>
          <TicTacToeBoard size={1 + radius * 2} />
          <FormControl id="reuseCount">
            <FormLabel>Cut from edges: {edgesCut}</FormLabel>
            <Input
              type="range"
              min={1}
              max={255}
              value={edgesCut || 1}
              onChange={(e) => setEdgesCut(e.target.value)}
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
          {isLoading && <Progress value={progress} size="lg" w="100%" />}
        </VStack>
        <Flex mt={5} justify="center">
          {mainImageURL && (
            <ChakraImage w="1000px" src={mainImageURL} alt="Main" mx={2} />
          )}
          {mosaicImage && (
            <Box
              border="1px solid"
              borderColor="gray.300"
              borderRadius="md"
              mx={2}
            >
              <ChakraImage w="1000px" src={mosaicImage} alt="Mosaic" />
            </Box>
          )}
        </Flex>
      </Box>
    </ChakraProvider>
  );
}

export default App;
