import React, { useState, useEffect } from "react";
import {
  ChakraProvider,
  Box,
  Button,
  Input,
  FormControl,
  FormLabel,
  Spinner,
  useToast,
  VStack,
  HStack,
  Heading,
  Flex,
} from "@chakra-ui/react";
import pica from "pica";

function App() {
  const [mainImage, setMainImage] = useState(null);
  const [mainImageURL, setMainImageURL] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [tileWidth, setTileWidth] = useState(10);
  const [tileHeight, setTileHeight] = useState(10);
  const [mosaicImage, setMosaicImage] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
    const mainImg = await loadImage(mainImageFile);
    const mainCanvas = document.createElement("canvas");
    const mainCtx = mainCanvas.getContext("2d", { willReadFrequently: true });

    mainCanvas.width = mainImg.width;
    mainCanvas.height = mainImg.height;
    mainCtx.drawImage(mainImg, 0, 0);

    const mosaicCanvas = document.createElement("canvas");
    mosaicCanvas.width = mainCanvas.width;
    mosaicCanvas.height = mainCanvas.height;
    const mosaicCtx = mosaicCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    const picaInstance = pica();

    const tileCanvases = await Promise.all(
      tiles.map((tile) => {
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = tileWidth;
        tileCanvas.height = tileHeight;
        const tileCtx = tileCanvas.getContext("2d", {
          willReadFrequently: true,
        });
        return picaInstance.resize(tile, tileCanvas).then(() => {
          return {
            canvas: tileCanvas,
            color: getAverageColor(
              tileCtx.getImageData(0, 0, tileWidth, tileHeight).data
            ),
          };
        });
      })
    );

    const availableTiles = [...tileCanvases];

    for (let y = 0; y < mainCanvas.height; y += tileHeight) {
      for (let x = 0; x < mainCanvas.width; x += tileWidth) {
        if (availableTiles.length === 0) {
          console.warn("Not enough unique tiles to fill the mosaic.");
          break;
        }

        const { data } = mainCtx.getImageData(x, y, tileWidth, tileHeight);
        const avgColor = getAverageColor(data);
        const bestMatchIndex = findBestMatchTileIndex(avgColor, availableTiles);
        const bestMatchTile = availableTiles[bestMatchIndex];

        mosaicCtx.drawImage(bestMatchTile.canvas, x, y, tileWidth, tileHeight);

        // Uncomment this line if you don't want to reuse the same tile
        // availableTiles.splice(bestMatchIndex, 1);
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
        <VStack spacing={5}>
          <Heading>Mosaic Image Generator</Heading>
          <FormControl id="mainImage">
            <FormLabel>Main Image</FormLabel>
            <Input type="file" onChange={handleMainImageChange} />
          </FormControl>
          <FormControl id="tileImages">
            <FormLabel>Tile Images</FormLabel>
            <Input type="file" multiple onChange={handleTileImagesChange} />
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
          {isLoading && <Spinner size="xl" />}
          <Flex>
            {mainImageURL && <img src={mainImageURL} alt="Main" />}{" "}
            {mosaicImage && (
              <Box>
                <Heading size="md">Mosaic Image</Heading>
                <img src={mosaicImage} alt="Mosaic" />
              </Box>
            )}
          </Flex>
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App;
