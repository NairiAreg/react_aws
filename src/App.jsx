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
  Checkbox,
  Text,
  IconButton,
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";

import pica from "pica";

function App() {
  const [mainImage, setMainImage] = useState(null);
  const [mainImageURL, setMainImageURL] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [reuseTiles, setReuseTiles] = useState();
  const [reuseTilesCount, setReuseTilesCount] = useState(0);

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

    // Create the mosaic
    for (let y = 0; y < mainCanvas.height; y += tileHeight) {
      const progressPercent = 50 + Math.round((currentTile / totalTiles) * 50);
      console.log(progressPercent);
      setProgress(() => progressPercent);
      await delay(); //! This is THE ONLY WAY to update the progress bar
      for (let x = 0; x < mainCanvas.width; x += tileWidth) {
        currentTile++;
        if (currentTile % 10 === 0) {
          // Update progress every 10 tiles
        }

        if (availableTiles.length === 0) {
          console.warn("Not enough unique tiles to fill the mosaic.");
          break;
        }

        const { data } = mainCtx.getImageData(x, y, tileWidth, tileHeight);
        const avgColor = getAverageColor(data);
        const bestMatchIndex = findBestMatchTileIndex(avgColor, availableTiles);
        const bestMatchTile = availableTiles[bestMatchIndex];

        const isAdjacent = (pos) =>
          Math.abs(pos.x - x) <= tileWidth && Math.abs(pos.y - y) <= tileHeight;

        //! Ths one accepts diagonals
        // const isAdjacent = (pos) =>
        //   (pos.x === x && Math.abs(pos.y - y) === tileHeight) || //? Above or below
        //   (pos.y === y && Math.abs(pos.x - x) === tileWidth); //? Left or right

        if (bestMatchTile.positions.some(isAdjacent)) {
          // Find another tile if this one is adjacent
          const nonAdjacentTile = availableTiles.find(
            (tile) =>
              !tile.positions.some(isAdjacent) && tile.count < reuseTilesCount
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
            if (nonAdjacentTile.count >= reuseTilesCount) {
              availableTiles.splice(availableTiles.indexOf(nonAdjacentTile), 1);
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
            if (bestMatchTile.count >= reuseTilesCount) {
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
          if (bestMatchTile.count >= reuseTilesCount) {
            availableTiles.splice(bestMatchIndex, 1);
          }
        }
      }
    }

    return new Promise((resolve) => {
      mosaicCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      });
    });
  };

  const loadImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = event.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const getAverageColor = (data) => {
    let r = 0,
      g = 0,
      b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const pixelCount = data.length / 4;
    return {
      r: Math.round(r / pixelCount),
      g: Math.round(g / pixelCount),
      b: Math.round(b / pixelCount),
    };
  };

  const findBestMatchTileIndex = (color, tiles) => {
    let minDistance = Infinity;
    let bestMatchIndex = 0;
    for (let i = 0; i < tiles.length; i++) {
      const tileColor = tiles[i].color;
      const distance = colorDistance(color, tileColor);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatchIndex = i;
      }
    }
    return bestMatchIndex;
  };

  const colorDistance = (color1, color2) => {
    return Math.sqrt(
      Math.pow(color1.r - color2.r, 2) +
        Math.pow(color1.g - color2.g, 2) +
        Math.pow(color1.b - color2.b, 2)
    );
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
          <Button
            colorScheme="teal"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Create Mosaic
          </Button>
          <FormControl id="reuseTiles">
            <FormLabel>Reuse Tiles</FormLabel>
            <Checkbox onChange={(e) => setReuseTiles(e.target.checked)} />
          </FormControl>

          {reuseTiles && (
            <FormControl id="reuseCount">
              <FormLabel>
                Reuse Count:{" "}
                {reuseTilesCount > 0 ? reuseTilesCount : "Infinity"}
              </FormLabel>
              <Input
                type="range"
                min={0}
                max={10}
                value={reuseTilesCount || 0}
                onChange={(e) => setReuseTilesCount(e.target.value)}
              />
            </FormControl>
          )}

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
              p={2}
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
