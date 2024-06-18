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
  Text,
  Image as ChakraImage,
  IconButton,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";
import pica from "pica";

import {
  createColorChart,
  getAverageColor,
  groupColors,
  loadImage,
} from "utils/imageUtils";
import SquareInfo from "components/SquareInfo";
import CustomSlider from "components/CustomSlider";

function MosaicGeneration() {
  const [mainImages, setMainImages] = useState([]);
  const [mainImageURLs, setMainImageURLs] = useState([]);
  const [drawnTilesState, setDrawnTiles] = useState(0);
  const [tolerance, setTolerance] = useState(20);
  const [usageQuantity, setUsageQuantity] = useState(15);

  const [tileWidth, setTileWidth] = useState(72);
  const [tileHeight, setTileHeight] = useState(72);
  const [imageWidth, setImageWidth] = useState(2880);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const toast = useToast();

  const handleMainImageChange = (e) => {
    const files = Array.from(e.target.files);
    setMainImages(files);
    setMainImageURLs(files.map((file) => URL.createObjectURL(file)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mainImages.length === 0) {
      toast({
        title: "Missing images.",
        description: "Please upload the main images and tile images.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    await createMosaic(mainImages, +tileWidth, +tileHeight);
    setIsLoading(false);
  };

  const createMosaic = async (mainImageFiles, tileWidth, tileHeight) => {
    let realProgress = 0;
    setProgress(0);
    const picaInstance = pica();
    let allMainImageColors = [];

    for (let i = 0; i < mainImageFiles.length; i++) {
      const originalImg = await loadImage(mainImageFiles[i]);

      // Create a canvas to resize the main image
      const resizedCanvas = document.createElement("canvas");

      const aspectRatio = originalImg.height / originalImg.width;
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

      const delay = () => new Promise((resolve) => setTimeout(resolve, 0));

      const totalTilesX = Math.ceil(mainCanvas.width / tileWidth);
      const totalTilesY = Math.ceil(mainCanvas.height / tileHeight);
      const totalTiles = totalTilesX * totalTilesY;
      let currentTile = 0;

      const directions = [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 },
      ];

      const spiralOrder = [];
      let cx = Math.floor(totalTilesX / 2);
      let cy = Math.floor(totalTilesY / 2);
      let x = cx;
      let y = cy;
      let directionIndex = 0;
      let stepSize = 1;
      let stepsInCurrentDirection = 0;

      while (spiralOrder.length < totalTiles) {
        if (x >= 0 && x < totalTilesX && y >= 0 && y < totalTilesY) {
          spiralOrder.push({ x, y });
        }
        x += directions[directionIndex].dx;
        y += directions[directionIndex].dy;
        stepsInCurrentDirection++;

        if (stepsInCurrentDirection === stepSize) {
          directionIndex = (directionIndex + 1) % 4;
          stepsInCurrentDirection = 0;
          if (directionIndex === 0 || directionIndex === 2) {
            stepSize++;
          }
        }
      }

      let drawnTiles = 0;
      const mainImageColors = [];

      for (const pos of spiralOrder) {
        const progressPercent = Math.round(
          ((i * totalTiles + currentTile) /
            (mainImageFiles.length * totalTiles)) *
            100
        );
        if (progressPercent >= realProgress + 10) {
          // TODO add this to other pages
          realProgress = progressPercent;
          setProgress(() => progressPercent);
          await delay();
        }

        const x = pos.x * tileWidth;
        const y = pos.y * tileHeight;
        currentTile++;

        const { data } = mainCtx.getImageData(x, y, tileWidth, tileHeight);
        const avgColor = getAverageColor(data, true);
        mainImageColors.push(avgColor);
      }

      allMainImageColors = allMainImageColors.concat(mainImageColors);
      setDrawnTiles((prev) => prev + drawnTiles);
    }

    const mainImageColorStats = groupColors(allMainImageColors, tolerance);
    console.log(mainImageColorStats);
    createColorChart(
      mainImageColorStats.filter(({ count }) => count > 15),
      "colorChart"
    );
  };

  return (
    <ChakraProvider>
      <Box p={5}>
        <VStack spacing={5} maxW="600px" mx="auto">
          <Heading>Mosaic Image Generator</Heading>
          <FormControl id="mainImage">
            <FormLabel>Main Images</FormLabel>
            <Box
              border="1px dashed"
              borderColor="gray.300"
              p={3}
              borderRadius="md"
            >
              <Flex align="center">
                <IconButton
                  icon={<FaFileUpload />}
                  aria-label="Upload Main Images"
                  as="label"
                  htmlFor="main-image-input"
                  colorScheme="teal"
                  variant="outline"
                />
                <Input
                  id="main-image-input"
                  type="file"
                  multiple
                  onChange={handleMainImageChange}
                  hidden
                />
                <Text ml={3}>
                  {mainImages.length > 0
                    ? `${mainImages.length} files selected`
                    : "Click to upload main images"}
                </Text>
              </Flex>
            </Box>
          </FormControl>
          <FormControl id="drawAnimation">
            <FormLabel>Color tolerance: {tolerance}</FormLabel>
            <CustomSlider
              max={100}
              value={tolerance}
              onChange={(value) => setTolerance(value)}
              thumbColor="blue.500"
            />
          </FormControl>
          <FormControl id="drawAnimation">
            <FormLabel>Usage Quantity: {usageQuantity}</FormLabel>
            <CustomSlider
              max={100}
              value={usageQuantity}
              onChange={(value) => setUsageQuantity(value)}
              thumbColor="red.500"
            />
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
          <Button
            colorScheme="teal"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Create Mosaic
          </Button>
          {isLoading && <Progress value={progress} size="lg" w="100%" />}
        </VStack>
        <canvas id="colorChart"></canvas>
        {mainImageURLs.map((url, index) => (
          <ChakraImage key={index} w="1000px" src={url} alt="Main" mx={2} />
        ))}
      </Box>
    </ChakraProvider>
  );
}

export default MosaicGeneration;
